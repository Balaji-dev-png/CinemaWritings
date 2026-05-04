"""
DRF ViewSets and API views for the screenplay API.
"""
from django.http import HttpResponse
from django.db.models import Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
import reversion

from .models import Script, Scene, Element, ScriptVersion, HistoryEvent, WorkspaceAsset
from .serializers import (
    ScriptListSerializer,
    ScriptDetailSerializer,
    ScriptCreateSerializer,
    SceneSerializer,
    ElementSerializer,
    ScriptVersionSerializer,
    HistoryEventSerializer,
    BulkElementSerializer,
    WorkspaceAssetSerializer,
)


class ScriptViewSet(viewsets.ModelViewSet):
    """
    CRUD for screenplay scripts.

    list:    GET  /api/scripts/           — Dashboard list (lightweight)
    create:  POST /api/scripts/           — Create new script
    retrieve:GET  /api/scripts/{id}/      — Full detail with nested scenes/versions/history
    update:  PUT  /api/scripts/{id}/      — Update script metadata + content
    partial: PATCH /api/scripts/{id}/     — Partial update
    destroy: DELETE /api/scripts/{id}/    — Delete script
    """
    queryset = Script.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return ScriptListSerializer
        if self.action in ("create", "update", "partial_update"):
            return ScriptCreateSerializer
        return ScriptDetailSerializer

    def get_queryset(self):
        qs = Script.objects.filter(owner=self.request.user)
        if self.action == "list":
            qs = qs.prefetch_related("history", "versions", "scenes")
        else:
            qs = qs.prefetch_related(
                "scenes__elements", "versions", "history"
            )
        return qs

    def perform_create(self, serializer):
        with reversion.create_revision():
            script = serializer.save(owner=self.request.user)
            reversion.set_comment("Script created")
            # Create initial history event
            HistoryEvent.objects.create(
                script=script,
                action="CREATED",
                details="Script created",
            )

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_title = old_instance.title
        old_content = old_instance.content

        with reversion.create_revision():
            script = serializer.save()
            reversion.set_comment("Script updated")

            # Track title changes
            if script.title != old_title:
                HistoryEvent.objects.create(
                    script=script,
                    action="TITLE_CHANGED",
                    details=f'Title → "{script.title}"',
                )

            # Throttle content update history (once per 10 min)
            if script.content != old_content:
                from django.utils import timezone
                import datetime
                ten_min_ago = timezone.now() - datetime.timedelta(minutes=10)
                recent = HistoryEvent.objects.filter(
                    script=script,
                    action="CONTENT_UPDATED",
                    timestamp__gte=ten_min_ago,
                ).exists()
                if not recent:
                    HistoryEvent.objects.create(
                        script=script,
                        action="CONTENT_UPDATED",
                        details="Edit session recorded",
                    )

    # ── Custom actions ─────────────────────────────────────────────────

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        """GET /api/scripts/{id}/versions/ — List all saved versions."""
        script = self.get_object()
        versions = script.versions.all()
        serializer = ScriptVersionSerializer(versions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="versions/save")
    def save_version(self, request, pk=None):
        """POST /api/scripts/{id}/versions/save/ — Save a named version."""
        script = self.get_object()
        name = request.data.get("name", "")
        if not name:
            return Response(
                {"error": "Version name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        version = ScriptVersion.objects.create(
            script=script,
            name=name,
            content_snapshot=script.content,
        )
        HistoryEvent.objects.create(
            script=script,
            action="VERSION_SAVED",
            details=f'Saved version: "{name}"',
        )
        return Response(
            ScriptVersionSerializer(version).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="versions/(?P<version_id>[^/.]+)/restore")
    def restore_version(self, request, pk=None, version_id=None):
        """POST /api/scripts/{id}/versions/{version_id}/restore/ — Restore a version."""
        script = self.get_object()
        try:
            version = script.versions.get(id=version_id)
        except ScriptVersion.DoesNotExist:
            return Response(
                {"error": "Version not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        with reversion.create_revision():
            script.content = version.content_snapshot
            script.save()
            reversion.set_comment(f"Restored version: {version.name}")

        HistoryEvent.objects.create(
            script=script,
            action="VERSION_RESTORED",
            details=f'Restored version: "{version.name}"',
        )
        return Response(ScriptDetailSerializer(script).data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """GET /api/scripts/{id}/history/ — List history events."""
        script = self.get_object()
        events = script.history.all()
        serializer = HistoryEventSerializer(events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="export/pdf")
    def export_pdf(self, request, pk=None):
        """GET /api/scripts/{id}/export/pdf/ — Generate and download PDF."""
        script = self.get_object()
        from export.renderer import render_screenplay_pdf

        pdf_bytes = render_screenplay_pdf(script)
        filename = (script.title or "screenplay").replace(" ", "_")
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}.pdf"'
        return response

    @action(detail=True, methods=["get"], url_path="workspace")
    def workspace(self, request, pk=None):
        """GET /api/scripts/{id}/workspace/ — List all assets for the workspace."""
        script = self.get_object()
        assets = script.workspace_assets.all()
        serializer = WorkspaceAssetSerializer(assets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="workspace/sync")
    def workspace_sync(self, request, pk=None):
        """
        POST /api/scripts/{id}/workspace/sync/
        Batch sync workspace assets.
        Body: { "assets": [...], "edges": [...], "viewport": {...} }
        """
        script = self.get_object()
        assets_data = request.data.get("assets", [])
        
        asset_ids_in_payload = set()
        
        for asset_data in assets_data:
            asset_id = asset_data.get("asset_id", asset_data.get("id", ""))
            if not asset_id:
                continue
            asset_ids_in_payload.add(asset_id)
            
            # Map frontend 'type' field to Django 'asset_type'
            asset_type = asset_data.get("asset_type", asset_data.get("type", "shot"))
            # Normalize link-card -> link
            if asset_type == "link-card":
                asset_type = "link"
            
            WorkspaceAsset.objects.update_or_create(
                script=script,
                asset_id=asset_id,
                defaults={
                    "asset_type": asset_type,
                    "x": asset_data.get("x", 0),
                    "y": asset_data.get("y", 0),
                    "width": asset_data.get("width", 280),
                    "height": asset_data.get("height", 200),
                    "scale": asset_data.get("scale", 1.0),
                    "z_index": asset_data.get("zIndex", asset_data.get("z_index", 0)),
                    "content": asset_data,
                }
            )
        
        # Remove assets that are no longer in the payload
        if asset_ids_in_payload:
            script.workspace_assets.exclude(asset_id__in=asset_ids_in_payload).delete()
            
        # Save edges to Script model
        edges_data = request.data.get("edges")
        if edges_data is not None:
            script.workspace_edges = edges_data
            script.save(update_fields=["workspace_edges", "updated_at"])
        
        return Response({"status": "synced", "count": len(asset_ids_in_payload)}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], url_path="export/pitchdeck")
    def export_pitchdeck(self, request, pk=None):
        """
        GET/POST /api/scripts/{id}/export/pitchdeck/
        Generate and download a Director's Suite Pitch Deck PDF.

        POST body (optional): { "workspace_state": { "elements": [...] } }
        If no body, falls back to WorkspaceAsset model rows.
        """
        script = self.get_object()
        from export.renderer import render_pitchdeck_pdf

        workspace_state = None
        if request.method == "POST" and request.data:
            workspace_state = request.data.get("workspace_state")

        pdf_bytes = render_pitchdeck_pdf(script, workspace_state=workspace_state)
        filename = (script.title or "pitchdeck").replace(" ", "_")
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}_pitchdeck.pdf"'
        return response

    @action(detail=True, methods=["get"], url_path="export/workspace-pdf")
    def export_workspace_pdf(self, request, pk=None):
        """
        GET /api/scripts/{id}/export/workspace-pdf/
        Generate a Director's Suite PDF using Puppeteer (headless Chromium).
        Falls back to WeasyPrint pitchdeck if Puppeteer is unavailable.
        """
        import subprocess
        import tempfile
        import shutil

        script = self.get_object()
        filename = (script.title or "workspace").replace(" ", "_")

        # Try Puppeteer first
        node_bin = shutil.which("node")
        if node_bin:
            import os
            script_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            export_script = os.path.join(script_dir, "scripts", "export-workspace.js")

            if os.path.exists(export_script):
                try:
                    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                        tmp_path = tmp.name

                    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
                    result = subprocess.run(
                        [node_bin, export_script, str(pk), tmp_path],
                        capture_output=True,
                        timeout=60,
                        env={**os.environ, "FRONTEND_URL": frontend_url},
                    )

                    if result.returncode == 0 and os.path.exists(tmp_path):
                        with open(tmp_path, "rb") as f:
                            pdf_bytes = f.read()
                        os.unlink(tmp_path)

                        response = HttpResponse(pdf_bytes, content_type="application/pdf")
                        response["Content-Disposition"] = f'attachment; filename="{filename}_workspace.pdf"'
                        return response
                    else:
                        # Log and fall through to WeasyPrint
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Puppeteer export failed: {result.stderr.decode()[:500]}")
                        if os.path.exists(tmp_path):
                            os.unlink(tmp_path)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Puppeteer export error: {e}")

        # Fallback: WeasyPrint pitchdeck
        from export.renderer import render_pitchdeck_pdf
        pdf_bytes = render_pitchdeck_pdf(script)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}_workspace.pdf"'
        return response
class SceneViewSet(viewsets.ModelViewSet):
    """CRUD for scenes within a script."""
    serializer_class = SceneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Scene.objects.filter(
            script_id=self.kwargs["script_pk"]
        ).prefetch_related("elements")

    def perform_create(self, serializer):
        script = Script.objects.get(pk=self.kwargs["script_pk"])
        serializer.save(script=script)


class ElementViewSet(viewsets.ModelViewSet):
    """CRUD for elements within a scene."""
    serializer_class = ElementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Element.objects.filter(
            scene_id=self.kwargs["scene_pk"],
            scene__script_id=self.kwargs["script_pk"],
        )

    def perform_create(self, serializer):
        scene = Scene.objects.get(
            pk=self.kwargs["scene_pk"],
            script_id=self.kwargs["script_pk"],
        )
        serializer.save(scene=scene)


from rest_framework.decorators import action, api_view, permission_classes

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def search_scripts(request):
    """
    GET /api/scripts/search/?q=query
    Full-text search across script content and metadata.
    """
    query = request.query_params.get("q", "").strip()
    if not query:
        return Response({"results": []})

    scripts = Script.objects.filter(
        owner=request.user,
    ).filter(
        Q(title__icontains=query)
        | Q(content__icontains=query)
        | Q(author__icontains=query)
        | Q(logline__icontains=query)
        | Q(synopsis__icontains=query)
    ).distinct()[:20]

    serializer = ScriptListSerializer(scripts, many=True)
    return Response({"results": serializer.data})


@api_view(["POST", "OPTIONS"])
@permission_classes([permissions.AllowAny])
def export_workspace_pdf(request):
    """
    POST /api/export/workspace-pdf/
    Accept a base64 workspace image and generate a landscape PDF with a title page.

    Body: { "image_base64": "data:image/png;base64,...", "title": "...", "script_id": "..." }
    Returns: application/pdf binary
    """
    if request.method == "OPTIONS":
        response = HttpResponse()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    import base64
    import io
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration

    image_base64 = request.data.get("image_base64", "")
    title = request.data.get("title", "Director's Suite")

    if not image_base64:
        return Response({"error": "image_base64 is required"}, status=status.HTTP_400_BAD_REQUEST)

    # Build HTML document
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <div class="title-page">
    <div class="title">{title}</div>
    <div class="subtitle">Director's Suite — Workspace Export</div>
    <div class="date">{__import__('datetime').date.today().strftime('%B %d, %Y')}</div>
  </div>
  <div class="workspace-page">
    <img src="{image_base64}" alt="Workspace" />
  </div>
</body>
</html>"""

    css_content = """
@page {
    size: A4 landscape;
    margin: 0.4in;
    background-color: #0d0d0d;
}

body {
    margin: 0;
    padding: 0;
    background-color: #0d0d0d;
    color: white;
    font-family: 'Courier New', Courier, monospace;
}

.title-page {
    page-break-after: always;
    height: 7.27in;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.title-page .title {
    font-size: 32pt;
    font-weight: bold;
    color: #c9a84c;
    margin-bottom: 0.3in;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.title-page .subtitle {
    font-size: 12pt;
    color: #777;
    margin-bottom: 0.2in;
}

.title-page .date {
    font-size: 10pt;
    color: #555;
}

.workspace-page {
    text-align: center;
}

.workspace-page img {
    max-width: 100%;
    max-height: 7.27in;
    object-fit: contain;
}
"""

    font_config = FontConfiguration()
    html = HTML(string=html_content)
    css = CSS(string=css_content, font_config=font_config)
    pdf_bytes = html.write_pdf(stylesheets=[css], font_config=font_config)

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="workspace.pdf"'
    response["Access-Control-Allow-Origin"] = "*"
    return response

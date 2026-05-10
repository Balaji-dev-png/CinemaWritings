"""
DRF ViewSets and API views for the screenplay API.
"""
from django.http import HttpResponse
from django.db.models import Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes as permission_classes_decorator
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import reversion

from .models import Script, Scene, Element, ScriptVersion, HistoryEvent, WorkspaceAsset, Storyboard, SceneCard
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
    StoryboardSerializer,
    SceneCardSerializer,
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
        if not self.request.user or self.request.user.is_anonymous:
            return Script.objects.none()
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

    @action(
        detail=True, 
        methods=["get", "post"], 
        url_path="export/pdf",
        permission_classes=[AllowAny]
    )
    def export_pdf(self, request, pk=None):
        """
        GET /api/scripts/{id}/export/pdf/ — Export from DB (fallback).
        POST /api/scripts/{id}/export/pdf/ — WYSIWYG PDF export with raw HTML.
        """
        from django.http import Http404
        from .models import Script
        from export.renderer import render_screenplay_pdf, render_screenplay_pdf_from_html

        try:
            script = self.get_object()
        except Http404:
            if request.method == "POST":
                script = Script(id=pk)
            else:
                raise

        if request.method == "POST":
            body = request.data
            pdf_bytes = render_screenplay_pdf_from_html(script, body)
        else:
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





# ─── Storyboard API ────────────────────────────────────────────────────────


class StoryboardViewSet(viewsets.ModelViewSet):
    """
    GET  /api/storyboards/{script_pk}/  → get or create storyboard for a script
    PATCH /api/storyboards/{script_pk}/ → update aspect ratio / title
    """

    serializer_class = StoryboardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Storyboard.objects.filter(
            script__owner=self.request.user
        ).select_related("script").prefetch_related("cards")

    def retrieve(self, request, script_pk=None):
        """GET → return existing storyboard, or create one if none exists."""
        try:
            script = Script.objects.get(pk=script_pk, owner=request.user)
        except Script.DoesNotExist:
            return Response({"error": "Script not found."}, status=status.HTTP_404_NOT_FOUND)

        storyboard, _ = Storyboard.objects.get_or_create(script=script)
        serializer = self.get_serializer(storyboard)
        return Response(serializer.data)

    def partial_update(self, request, script_pk=None):
        """PATCH → update title or aspect_ratio."""
        try:
            script = Script.objects.get(pk=script_pk, owner=request.user)
            storyboard = script.storyboard
        except (Script.DoesNotExist, Storyboard.DoesNotExist):
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(storyboard, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SceneCardViewSet(viewsets.ModelViewSet):
    """
    Full CRUD on scene cards within a storyboard.
    POST   /api/storyboards/{storyboard_pk}/cards/
    GET    /api/storyboards/{storyboard_pk}/cards/
    PATCH  /api/storyboards/{storyboard_pk}/cards/{pk}/
    DELETE /api/storyboards/{storyboard_pk}/cards/{pk}/
    POST   /api/storyboards/{storyboard_pk}/cards/reorder/
    """

    serializer_class = SceneCardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_storyboard(self, storyboard_pk):
        return Storyboard.objects.get(
            pk=storyboard_pk,
            script__owner=self.request.user
        )

    def get_queryset(self):
        storyboard_pk = self.kwargs.get("storyboard_pk")
        return SceneCard.objects.filter(
            storyboard__pk=storyboard_pk,
            storyboard__script__owner=self.request.user
        ).order_by("order")

    def perform_create(self, serializer):
        storyboard = self._get_storyboard(self.kwargs["storyboard_pk"])
        max_order = storyboard.cards.count()
        serializer.save(storyboard=storyboard, order=max_order)

    @action(detail=False, methods=["post"])
    def reorder(self, request, storyboard_pk=None):
        """
        POST /api/storyboards/{storyboard_pk}/cards/reorder/
        Body: { "order": ["card-uuid-1", "card-uuid-2", ...] }
        """
        try:
            storyboard = self._get_storyboard(storyboard_pk)
        except Storyboard.DoesNotExist:
            return Response({"error": "Storyboard not found."}, status=status.HTTP_404_NOT_FOUND)

        ordered_ids = request.data.get("order", [])
        if not ordered_ids:
            return Response({"error": "order list is required."}, status=status.HTTP_400_BAD_REQUEST)

        cards = {str(c.id): c for c in storyboard.cards.all()}
        for i, card_id in enumerate(ordered_ids):
            if card_id in cards:
                cards[card_id].order = i

        SceneCard.objects.bulk_update(list(cards.values()), ["order"])
        return Response({"status": "reordered"})

    @action(detail=False, methods=["delete"])
    def bulk_delete(self, request, storyboard_pk=None):
        """
        DELETE /api/storyboards/{storyboard_pk}/cards/bulk_delete/
        Body: { "ids": ["uuid1", "uuid2"] }
        """
        ids = request.data.get("ids", [])
        SceneCard.objects.filter(
            id__in=ids,
            storyboard__script__owner=request.user
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

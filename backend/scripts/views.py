"""
DRF ViewSets and API views for the screenplay API.
"""
from django.http import HttpResponse
from django.db.models import Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
import reversion

from .models import Script, Scene, Element, ScriptVersion, HistoryEvent
from .serializers import (
    ScriptListSerializer,
    ScriptDetailSerializer,
    ScriptCreateSerializer,
    SceneSerializer,
    ElementSerializer,
    ScriptVersionSerializer,
    HistoryEventSerializer,
    BulkElementSerializer,
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

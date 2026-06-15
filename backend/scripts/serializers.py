"""
DRF Serializers for the screenplay API.

Nested hierarchy: Script → Scene → Element
Script also includes versions and history in detail view.
"""

from rest_framework import serializers

from .models import (
    Element,
    HistoryEvent,
    Scene,
    Script,
    ScriptVersion,
    WorkspaceAsset,
    Storyboard,
    SceneCard,
    Note,
    TextFile,
)


class WorkspaceAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceAsset
        fields = [
            "id",
            "asset_id",
            "asset_type",
            "x",
            "y",
            "width",
            "height",
            "scale",
            "z_index",
            "content",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = [
            "id",
            "element_type",
            "content",
            "content_html",
            "order",
            "page_number",
            "order_within_page",
        ]
        read_only_fields = ["id"]


class SceneSerializer(serializers.ModelSerializer):
    elements = ElementSerializer(many=True, read_only=True)

    class Meta:
        model = Scene
        fields = ["id", "slugline", "order", "elements", "created_at"]
        read_only_fields = ["id", "created_at"]


class HistoryEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoryEvent
        fields = ["id", "action", "details", "timestamp"]
        read_only_fields = ["id", "timestamp"]


class ScriptVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScriptVersion
        fields = ["id", "name", "content_snapshot", "created_at"]
        read_only_fields = ["id", "created_at"]


class ScriptListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the dashboard list view."""

    history_count = serializers.SerializerMethodField()
    version_count = serializers.SerializerMethodField()
    scene_count = serializers.SerializerMethodField()

    class Meta:
        model = Script
        fields = [
            "id",
            "title",
            "author",
            "paper_color",
            "font_family",
            "text_color",
            "font_size",
            "tags",
            "created_at",
            "updated_at",
            "history_count",
            "version_count",
            "scene_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_history_count(self, obj):
        return obj.history.count()

    def get_version_count(self, obj):
        return obj.versions.count()

    def get_scene_count(self, obj):
        return obj.scenes.count()


class ScriptDetailSerializer(serializers.ModelSerializer):
    """Full serializer with nested scenes, versions, and history."""

    scenes = SceneSerializer(many=True, read_only=True)
    versions = ScriptVersionSerializer(many=True, read_only=True)
    history = HistoryEventSerializer(many=True, read_only=True)

    class Meta:
        model = Script
        fields = [
            "id",
            "title",
            "author",
            "contact",
            "logline",
            "synopsis",
            "written_by_prefix",
            "content",
            "paper_color",
            "font_family",
            "text_color",
            "font_size",
            "tags",
            "workspace_edges",
            "canvas_viewport",
            "drawing_strokes",
            "created_at",
            "updated_at",
            "scenes",
            "versions",
            "history",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ScriptCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating scripts (flat metadata + content)."""

    id = serializers.UUIDField(required=False)
    title = serializers.CharField(
        max_length=255,
        required=False,
        default="Untitled Script",
    )
    logline = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
    )
    synopsis = serializers.CharField(
        max_length=5000,
        required=False,
        allow_blank=True,
    )
    # Content is stored as HTML — limit to ~5MB to prevent abuse
    content = serializers.CharField(
        max_length=5 * 1024 * 1024,
        required=False,
        allow_blank=True,
    )

    def validate_title(self, value):
        """Strip leading/trailing whitespace and enforce non-empty."""
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Title cannot be blank.")
        return stripped

    def validate_font_size(self, value):
        """Enforce reasonable font size range."""
        if value is not None and not (6 <= value <= 72):
            raise serializers.ValidationError("Font size must be between 6 and 72.")
        return value

    class Meta:
        model = Script
        fields = [
            "id",
            "title",
            "author",
            "contact",
            "logline",
            "synopsis",
            "written_by_prefix",
            "content",
            "paper_color",
            "font_family",
            "text_color",
            "font_size",
            "tags",
            "workspace_edges",
            "canvas_viewport",
            "drawing_strokes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class BulkElementSerializer(serializers.Serializer):
    """Accepts a list of elements to create/update in a scene."""

    scene_id = serializers.UUIDField()
    elements = ElementSerializer(many=True)

    def create(self, validated_data):
        scene_id = validated_data["scene_id"]
        elements_data = validated_data["elements"]
        scene = Scene.objects.get(id=scene_id)
        # Clear old elements and bulk-create new ones
        scene.elements.all().delete()
        objs = [Element(scene=scene, **el_data) for el_data in elements_data]
        return Element.objects.bulk_create(objs)


class SceneCardSerializer(serializers.ModelSerializer):
    """Serializer for individual storyboard scene cards."""

    class Meta:
        model = SceneCard
        fields = [
            "id",
            "order",
            "shot_number",
            "scene_heading",
            "shot_type",
            "camera_movement",
            "lens",
            "technical_notes",
            "image_url",
            # Infinite canvas spatial fields
            "x",
            "y",
            "width",
            "height",
            "aspect_ratio",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class StoryboardSerializer(serializers.ModelSerializer):
    """Serializer for the storyboard with nested scene cards."""

    cards = SceneCardSerializer(many=True, read_only=True)
    script_title = serializers.CharField(source="script.title", read_only=True)

    class Meta:
        model = Storyboard
        fields = [
            "id",
            "script_title",
            "title",
            "aspect_ratio",
            "cards",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class NoteSerializer(serializers.ModelSerializer):
    """Serializer for user notes (global or script-linked)."""

    script_id = serializers.UUIDField(source="script.id", read_only=True, allow_null=True)

    class Meta:
        model = Note
        fields = [
            "id",
            "script_id",
            "title",
            "content",
            "color",
            "pinned",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TextFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TextFile
        fields = [
            "id",
            "name",
            "content",
            "language",
            "encoding",
            "line_endings",
            "pinned",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


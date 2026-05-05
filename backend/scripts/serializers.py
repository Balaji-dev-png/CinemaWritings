"""
DRF Serializers for the screenplay API.

Nested hierarchy: Script → Scene → Element
Script also includes versions and history in detail view.
"""

from rest_framework import serializers

from .models import Element, HistoryEvent, Scene, Script, ScriptVersion, WorkspaceAsset


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

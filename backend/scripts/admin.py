"""
Django admin configuration for screenplay models.
"""
from django.contrib import admin
import reversion
from .models import Script, Scene, Element, ScriptVersion, HistoryEvent


class ElementInline(admin.TabularInline):
    model = Element
    extra = 0
    fields = ["order", "element_type", "content"]
    ordering = ["order"]


class SceneInline(admin.TabularInline):
    model = Scene
    extra = 0
    fields = ["order", "slugline"]
    ordering = ["order"]
    show_change_link = True


@admin.register(Script)
class ScriptAdmin(reversion.admin.VersionAdmin):
    list_display = ["title", "author", "updated_at", "created_at"]
    list_filter = ["created_at", "updated_at"]
    search_fields = ["title", "author", "content"]
    inlines = [SceneInline]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    list_display = ["slugline", "script", "order"]
    list_filter = ["script"]
    inlines = [ElementInline]
    ordering = ["script", "order"]


@admin.register(Element)
class ElementAdmin(admin.ModelAdmin):
    list_display = ["element_type", "content_preview", "scene", "order"]
    list_filter = ["element_type", "scene__script"]
    ordering = ["scene", "order"]

    def content_preview(self, obj):
        return obj.content[:80] + "…" if len(obj.content) > 80 else obj.content
    content_preview.short_description = "Content"


@admin.register(ScriptVersion)
class ScriptVersionAdmin(admin.ModelAdmin):
    list_display = ["name", "script", "created_at"]
    list_filter = ["script"]
    readonly_fields = ["created_at"]


@admin.register(HistoryEvent)
class HistoryEventAdmin(admin.ModelAdmin):
    list_display = ["action", "script", "timestamp", "details"]
    list_filter = ["action", "script"]
    readonly_fields = ["timestamp"]

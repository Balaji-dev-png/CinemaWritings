"""
Screenplay data models.

Relational hierarchy:
  Script → Scene → Element

Each Script also has ScriptVersions for draft snapshots,
and a HistoryEvent log for audit trail.
"""

import uuid

from django.contrib.auth.models import User
from django.contrib.postgres.search import SearchVectorField
from django.db import models


class Script(models.Model):
    """Top-level screenplay document with metadata."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.CASCADE, related_name="scripts"
    )
    title = models.CharField(max_length=255, default="Untitled Script")
    author = models.CharField(max_length=255, blank=True, default="")
    contact = models.TextField(blank=True, default="")
    logline = models.TextField(blank=True, default="")
    synopsis = models.TextField(blank=True, default="")
    written_by_prefix = models.CharField(max_length=100, default="written by")
    # Full HTML content of the script (TipTap output) — kept for fast retrieval
    content = models.TextField(blank=True, default="")

    # Styling
    paper_color = models.CharField(max_length=20, blank=True, default="")
    font_family = models.CharField(max_length=100, blank=True, default="Courier Prime")
    text_color = models.CharField(max_length=20, blank=True, default="")
    font_size = models.PositiveIntegerField(default=12)

    tags = models.JSONField(default=list, blank=True)
    workspace_edges = models.JSONField(
        default=list, blank=True, help_text="Node connections for the Director's Suite"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class Scene(models.Model):
    """Container for ordering elements and tracking sluglines."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    script = models.ForeignKey(Script, on_delete=models.CASCADE, related_name="scenes")
    slugline = models.CharField(max_length=255, blank=True, default="")
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        unique_together = [("script", "order")]

    def __str__(self):
        return f"{self.order}: {self.slugline}"


class Element(models.Model):
    """Atomic screenplay unit — a single paragraph/block in the script."""

    ELEMENT_TYPES = [
        ("scene_heading", "Scene Heading"),
        ("action", "Action"),
        ("character", "Character"),
        ("dialogue", "Dialogue"),
        ("parenthetical", "Parenthetical"),
        ("transition", "Transition"),
        ("shot", "Shot"),
        ("extension", "Extension (V.O./O.S.)"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name="elements")
    element_type = models.CharField(
        max_length=20, choices=ELEMENT_TYPES, default="action"
    )
    content = models.TextField(blank=True, default="")
    # Rich text HTML (inline formatting: bold, italic, underline)
    content_html = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)
    # Pagination fields — tracks which page this element belongs to
    page_number = models.PositiveIntegerField(default=1)
    order_within_page = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["page_number", "order_within_page", "order"]

    def __str__(self):
        return f"[{self.element_type}] {self.content[:60]}"


class ScriptVersion(models.Model):
    """Named draft snapshot for version history."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    script = models.ForeignKey(
        Script, on_delete=models.CASCADE, related_name="versions"
    )
    name = models.CharField(max_length=255)
    content_snapshot = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.created_at:%Y-%m-%d %H:%M})"


class HistoryEvent(models.Model):
    """Audit log entry for a script."""

    ACTION_CHOICES = [
        ("CREATED", "Created"),
        ("TITLE_CHANGED", "Title Changed"),
        ("CONTENT_UPDATED", "Content Updated"),
        ("VERSION_SAVED", "Version Saved"),
        ("VERSION_RESTORED", "Version Restored"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    script = models.ForeignKey(Script, on_delete=models.CASCADE, related_name="history")
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    details = models.TextField(blank=True, default="")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.action} — {self.timestamp:%Y-%m-%d %H:%M}"


class CanvasState(models.Model):
    """Stores the Creative Workspace (infinite canvas) state for a script."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    script = models.OneToOneField(
        Script, on_delete=models.CASCADE, related_name="canvas"
    )
    state = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Canvas State"
        verbose_name_plural = "Canvas States"

    def __str__(self):
        return f"Canvas for {self.script.title}"


class WorkspaceAsset(models.Model):
    """Individual asset in the Director's Suite workspace.

    Stores position, scale, and a flexible JSON payload for each element.
    Used for server-side Pitch Deck PDF rendering.
    """

    ASSET_TYPES = [
        ("image", "Image"),
        ("link", "Link Card"),
        ("shot", "Shot Card"),
        ("idea", "Idea Block"),
        ("text", "Text Block"),
        ("sticky", "Sticky Note"),
        ("mermaid", "Mermaid Graph"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    script = models.ForeignKey(
        Script, on_delete=models.CASCADE, related_name="workspace_assets"
    )
    asset_id = models.CharField(
        max_length=128,
        blank=True,
        default="",
        help_text="Frontend element UUID for cross-referencing",
    )
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPES)
    x = models.FloatField(default=0)
    y = models.FloatField(default=0)
    width = models.FloatField(default=280)
    height = models.FloatField(default=200)
    scale = models.FloatField(default=1.0)
    z_index = models.IntegerField(default=0)
    content = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["z_index"]
        verbose_name = "Workspace Asset"
        verbose_name_plural = "Workspace Assets"

    def __str__(self):
        return f"[{self.asset_type}] {self.content.get('title', self.id)}"

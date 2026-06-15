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
    canvas_viewport = models.JSONField(
        default=dict, blank=True,
        help_text="Director's Suite viewport state: {zoom, pan: {x, y}}"
    )
    drawing_strokes = models.JSONField(
        default=list, blank=True,
        help_text="Director's Suite freehand drawing strokes"
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
        return f"Note: {self.title} by {self.owner.username}"


class TextFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="text_files")
    name = models.CharField(max_length=255, default="Untitled")
    content = models.TextField(blank=True, default="")
    language = models.CharField(max_length=50, default="plaintext")
    encoding = models.CharField(max_length=20, default="UTF-8")
    line_endings = models.CharField(max_length=10, default="LF")
    pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.language})"


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


class Storyboard(models.Model):
    """Visual storyboard linked to a Script. One storyboard per script."""

    ASPECT_RATIOS = [
        ("16:9", "Widescreen 16:9"),
        ("2.39:1", "Cinemascope 2.39:1"),
        ("4:3", "Academy 4:3"),
        ("1.85:1", "Flat 1.85:1"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    script = models.OneToOneField(
        Script, on_delete=models.CASCADE, related_name="storyboard"
    )
    title = models.CharField(max_length=255, blank=True, default="")
    aspect_ratio = models.CharField(
        max_length=10, choices=ASPECT_RATIOS, default="16:9"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Storyboard"
        verbose_name_plural = "Storyboards"

    def __str__(self):
        return f"Storyboard for {self.script.title}"


class SceneCard(models.Model):
    """Individual shot card in a storyboard."""

    SHOT_TYPES = [
        ("EWS", "Extreme Wide Shot"),
        ("WS", "Wide Shot"),
        ("FS", "Full Shot"),
        ("MWS", "Medium Wide / Cowboy"),
        ("MS", "Medium Shot"),
        ("MCU", "Medium Close-Up"),
        ("CU", "Close-Up"),
        ("ECU", "Extreme Close-Up"),
        ("INSERT", "Insert Shot"),
        ("OTS", "Over-the-Shoulder"),
        ("POV", "Point of View"),
        ("TWO", "Two Shot"),
        ("DUTCH", "Dutch Angle"),
        ("AERIAL", "Aerial Shot"),
        ("CRANE", "Crane Shot"),
    ]

    CAMERA_MOVEMENTS = [
        ("static", "Static"),
        ("pan_l", "Pan Left"),
        ("pan_r", "Pan Right"),
        ("tilt_u", "Tilt Up"),
        ("tilt_d", "Tilt Down"),
        ("dolly_in", "Dolly In"),
        ("dolly_out", "Dolly Out"),
        ("crane_u", "Crane Up"),
        ("crane_d", "Crane Down"),
        ("handheld", "Handheld"),
        ("steadicam", "Steadicam"),
        ("zoom_in", "Zoom In"),
        ("zoom_out", "Zoom Out"),
        ("arc", "Arc Shot"),
        ("whip", "Whip Pan"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    storyboard = models.ForeignKey(
        Storyboard, on_delete=models.CASCADE, related_name="cards"
    )
    order = models.PositiveIntegerField(default=0, db_index=True)
    shot_number = models.CharField(max_length=20, default="", blank=True)
    scene_heading = models.CharField(max_length=255, default="", blank=True)
    shot_type = models.CharField(
        max_length=20, choices=SHOT_TYPES, default="MS", blank=True
    )
    camera_movement = models.CharField(
        max_length=20, choices=CAMERA_MOVEMENTS, default="static", blank=True
    )
    lens = models.CharField(max_length=50, default="", blank=True)
    technical_notes = models.TextField(default="", blank=True)
    image_url = models.URLField(max_length=2048, default="", blank=True)
    # Infinite canvas spatial fields
    x = models.FloatField(default=0)
    y = models.FloatField(default=0)
    width = models.FloatField(default=320)
    height = models.FloatField(default=500)
    aspect_ratio = models.CharField(max_length=20, default="1.78:1", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        verbose_name = "Scene Card"
        verbose_name_plural = "Scene Cards"

    def __str__(self):
        return f"Shot {self.shot_number or self.order} — {self.scene_heading[:40]}"


class Note(models.Model):
    """Personal note linked optionally to a script. Private per user."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notes"
    )
    # Optional link to a script — null means it's a standalone/global note
    script = models.ForeignKey(
        Script,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notes",
    )
    title = models.CharField(max_length=255, default="Untitled Note")
    content = models.TextField(blank=True, default="")
    color = models.CharField(max_length=30, default="#1a1a1a")
    pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-pinned", "-updated_at"]

    def __str__(self):
        return self.title


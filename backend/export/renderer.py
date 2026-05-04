"""
WeasyPrint-based PDF renderer for screenplays.

Converts a Script model instance into a WGA-standard PDF with:
  - 1.5" left margin (binding), 1" right/top/bottom
  - Courier Prime 12pt, 1.2 line-height
  - Title page: block-level with absolute positioning, forced page break
  - Proper element indentation per WGA / Hollywood standards
"""
import io
from django.template.loader import render_to_string
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration

# ─── WGA Standard Layout Constants ─────────────────────────────────────────
# This CSS is dynamically updated with user preferences
def get_dynamic_css(paper_color="#ffffff", text_color="#000000", font_family="Courier Prime"):
    return f"""
@page {{
    size: letter;
    margin: 1.0in 1.0in 1.0in 1.5in;
    background-color: {paper_color};
    @top-right {{
        content: counter(page) ".";
        font-family: '{font_family}', 'Courier Prime', Courier, monospace;
        font-size: 12pt;
        vertical-align: bottom;
        padding-bottom: 0.5in;
    }}
}}

@page :first {{
    @top-right {{ content: none; }}
}}

@font-face {{
    font-family: 'Courier Prime';
    src: url('https://fonts.gstatic.com/s/courierprime/v9/u-4n0qW6p57vka8V2WnLpNeVfE8.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
}}

@font-face {{
    font-family: 'Courier Prime';
    src: url('https://fonts.gstatic.com/s/courierprime/v9/u-4k0qW6p57vka8V2WhD9eRfYfg.woff2') format('woff2');
    font-weight: bold;
    font-style: normal;
}}

@font-face {{
    font-family: 'Courier Prime';
    src: url('https://fonts.gstatic.com/s/courierprime/v9/u-4i0qW6p57vka8V2WhD9eRJk4ZKag.woff2') format('woff2');
    font-weight: normal;
    font-style: italic;
}}

@font-face {{
    font-family: 'Courier Prime';
    src: url('https://fonts.gstatic.com/s/courierprime/v9/u-4g0qW6p57vka8V2WhD9eRfV_5hJRaC.woff2') format('woff2');
    font-weight: bold;
    font-style: italic;
}}

body {{
    font-family: '{font_family}', 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: 12pt;
    line-height: 1.2;
    color: {text_color};
    background-color: {paper_color};
    margin: 0;
    padding: 0;
}}

/* Rich Text Formatting */
strong, b {{ font-weight: bold; }}
em, i {{ font-style: italic; }}
u {{ text-decoration: underline; }}

/* ─── Title Page ───
   Block-level container with absolute positioning.
   NO display:flex — WeasyPrint collapses flex containers in paged media,
   causing the title page and script body to merge onto a single sheet.
   ──────────────────────────────────────────────────────────────────── */
.title-page {{
    page-break-after: always;
    position: relative;
    height: 9.0in;
    text-align: center;
}}

/* Title block: absolute-positioned at 3.5in from the top of the page */
.title-page .title-block {{
    position: absolute;
    top: 3.5in;
    width: 100%;
    text-align: center;
}}

.title-page .title {{
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    text-decoration: underline;
    margin-bottom: 0.25in;
}}

.title-page .written-by {{
    font-size: 12pt;
    margin-bottom: 0.25in;
}}

.title-page .author {{
    font-size: 12pt;
}}

/* Contact info: anchored to the bottom-left of the title page */
.title-page .contact-block {{
    position: absolute;
    bottom: 0;
    left: 0;
    text-align: left;
    font-size: 12pt;
    line-height: 1.4;
}}

.title-page .rights-line {{
    margin-top: 12pt;
    font-size: 12pt;
}}

/* ─── Script Elements ─── */
.script-body p {{
    margin: 0;
    padding: 0;
    line-height: 1.2;
    font-size: 12pt;
    orphans: 2;
    widows: 2;
    white-space: pre-wrap;
}}

/* Scene Heading */
.script-body p.scene_heading {{
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 1.2em;
    margin-bottom: 0.4em;
    page-break-after: avoid;
}}

/* Action */
.script-body p.action {{
    margin-top: 1em;
}}

/* Character Name — 2.0in from left margin (= 3.5in from paper edge) */
.script-body p.character {{
    text-transform: uppercase;
    margin-top: 1.2em;
    margin-left: 2.0in;
    page-break-after: avoid;
}}

/* Parenthetical */
.script-body p.parenthetical {{
    margin-left: 1.6in;
    max-width: 2.5in;
    page-break-after: avoid;
}}

/* Dialogue — 1.0in from both left and right margins */
.script-body p.dialogue {{
    margin-left: 1.0in;
    margin-right: 1.0in;
    margin-bottom: 0.4em;
}}

/* Transition */
.script-body p.transition {{
    text-transform: uppercase;
    text-align: right;
    margin-top: 1em;
    margin-bottom: 1em;
}}

/* Shot */
.script-body p.shot {{
    text-transform: uppercase;
    margin-top: 1em;
    margin-bottom: 1em;
}}

/* Extension */
.script-body p.extension {{
    text-transform: uppercase;
}}

.script-page {{
    page-break-after: always;
}}
.script-page:last-child {{
    page-break-after: auto;
}}
"""


def _parse_html_to_elements(html_content):
    """
    Parse TipTap HTML output into a list of pages.
    Fixes typos and applies transformations (uppercase).
    Ensures scene headings use "INT. LOCATION - DAY" format.
    """
    from html.parser import HTMLParser
    import re

    pages = [[]]
    current_page = 0

    UPPER_TYPES = {"scene-heading", "character", "transition", "shot", "extension"}

    class ScriptHTMLParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.in_p = False
            self.in_page_node = False
            self.p_class = "action"
            self.p_html_parts = []

        def handle_starttag(self, tag, attrs):
            nonlocal current_page, pages
            attrs_dict = dict(attrs)

            if tag == "div" and attrs_dict.get("data-type") == "pageNode":
                self.in_page_node = True
                if pages[current_page]:
                    pages.append([])
                    current_page = len(pages) - 1
                return

            if tag == "p":
                self.in_p = True
                self.p_class = attrs_dict.get("class", "action")
                self.p_html_parts = []
            elif self.in_p:
                attr_str = "".join([f' {k}="{v}"' for k, v in attrs])
                self.p_html_parts.append(f"<{tag}{attr_str}>")

        def handle_endtag(self, tag):
            if tag == "div" and self.in_page_node:
                self.in_page_node = False
                return
            if tag == "p" and self.in_p:
                self.in_p = False
                content = "".join(self.p_html_parts).strip()
                if content:
                    # FIX: Normalize scene headings to "INT. LOCATION - TIME"
                    if self.p_class == "scene-heading":
                        # Replace "INT," or "EXT," or "I/E," with "INT." or "EXT." or "I/E."
                        content = re.sub(
                            r'^(INT|EXT|I\/E|INT\./EXT)[,;:\s]+',
                            r'\1. ',
                            content,
                            flags=re.IGNORECASE
                        )
                        # Ensure a hyphen before the time-of-day keyword
                        # Uses negative lookbehind to avoid inserting double-hyphens
                        content = re.sub(
                            r'(?<!-)\s+(DAY|NIGHT|MORNING|EVENING|DAWN|DUSK|LATER|CONTINUOUS|SAME TIME|MOMENTS LATER)\s*$',
                            r' - \1',
                            content,
                            flags=re.IGNORECASE
                        )
                    
                    # Transformation: Automatic Uppercase for specific types
                    if self.p_class in UPPER_TYPES:
                        content = content.upper()
                        
                    pages[current_page].append((self.p_class.replace("-", "_"), content))
            elif self.in_p:
                self.p_html_parts.append(f"</{tag}>")

        def handle_data(self, data):
            if self.in_p:
                self.p_html_parts.append(data)

    parser = ScriptHTMLParser()
    parser.feed(html_content or "")
    
    return [p for p in pages if p] or [[]]


def render_screenplay_pdf(script):
    """
    Render a Script model instance to PDF bytes using WeasyPrint.
    """
    from django.template.loader import render_to_string
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration

    pages = _parse_html_to_elements(script.content)

    context = {
        "title": script.title or "UNTITLED",
        "written_by_prefix": script.written_by_prefix or "written by",
        "author": script.author or "",
        "contact": script.contact or "",
        "logline": script.logline or "",
        "synopsis": script.synopsis or "",
        "pages": pages,
    }

    html_string = render_to_string("screenplay.html", context)
    font_config = FontConfiguration()
    html = HTML(string=html_string)
    
    dynamic_css = get_dynamic_css(
        paper_color=script.paper_color or "#ffffff",
        text_color=script.text_color or "#000000",
        font_family=script.font_family or "Courier Prime"
    )
    css = CSS(string=dynamic_css, font_config=font_config)

    return html.write_pdf(stylesheets=[css], font_config=font_config)


# ─── Pitch Deck (Director's Suite) Export ────────────────────────────────────

PITCHDECK_CSS = """
@page {
    size: letter landscape;
    margin: 0.6in 0.75in;
    @bottom-center {
        content: none;
    }
}

@font-face {
    font-family: 'Courier Prime';
    src: url('https://fonts.gstatic.com/s/courierprime/v9/u-4n0qW6p57vka8V2WnLpNeVfE8.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
}

@font-face {
    font-family: 'Courier Prime';
    src: url('https://fonts.gstatic.com/s/courierprime/v9/u-4k0qW6p57vka8V2WhD9eRfYfg.woff2') format('woff2');
    font-weight: bold;
    font-style: normal;
}

body {
    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: 10pt;
    line-height: 1.3;
    color: #e2e8f0;
    background-color: #121212;
    margin: 0;
    padding: 0;
}

/* ─── Deck Page ─── */
.deck-page {
    page-break-after: always;
    height: 6.3in;
    position: relative;
}
.deck-page:last-child {
    page-break-after: auto;
}

/* Header */
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.3in;
    border-bottom: 1px solid #334155;
    padding-bottom: 0.1in;
}
.page-header .project-title {
    font-weight: bold;
    font-size: 10pt;
    color: #94a3b8;
    letter-spacing: 0.05em;
}
.page-header .page-label {
    font-size: 8pt;
    color: #3b82f6;
    font-weight: bold;
    letter-spacing: 0.15em;
    text-transform: uppercase;
}

/* ─── Card Grid: 2×2 ─── */
.card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25in;
}

.card {
    width: 4.6in;
    min-height: 2.4in;
    background-color: #1e1e2e;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    page-break-inside: avoid;
}

/* Image area */
.card-image {
    width: 1.6in;
    min-height: 2.4in;
    background-color: #0f172a;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}
.card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.card-image-placeholder {
    text-align: center;
    color: #475569;
}
.placeholder-icon {
    font-size: 28pt;
}

/* Card body */
.card-body {
    flex: 1;
    padding: 0.15in 0.2in;
}

.card-type-badge {
    display: inline-block;
    font-size: 7pt;
    font-weight: bold;
    letter-spacing: 0.1em;
    padding: 2px 8px;
    border-radius: 4px;
    margin-bottom: 6px;
}

.card-title {
    font-size: 11pt;
    font-weight: bold;
    color: #f1f5f9;
    margin: 0 0 6px 0;
}

.card-meta-row {
    display: flex;
    gap: 0.1in;
    margin-bottom: 3px;
}
.meta-label {
    font-size: 7pt;
    color: #64748b;
    font-weight: bold;
    letter-spacing: 0.08em;
    min-width: 0.7in;
}
.meta-value {
    font-size: 9pt;
    color: #cbd5e1;
}

.card-notes {
    font-size: 8.5pt;
    color: #94a3b8;
    margin-top: 6px;
    line-height: 1.3;
}

/* Footer */
.page-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
    color: #475569;
    border-top: 1px solid #1e293b;
    padding-top: 4px;
}
"""

# Shot type metadata map (mirrors frontend SHOT_TYPES)
SHOT_TYPE_MAP = {
    "wide":             {"label": "Wide Shot (WS)",            "icon": "🎬", "color": "#3b82f6"},
    "medium":           {"label": "Medium Shot (MS)",           "icon": "🎥", "color": "#8b5cf6"},
    "close-up":         {"label": "Close Up (CU)",              "icon": "👁", "color": "#ef4444"},
    "extreme-close-up": {"label": "Extreme Close Up (ECU)",     "icon": "🔍", "color": "#f97316"},
    "over-shoulder":    {"label": "Over-the-Shoulder (OTS)",    "icon": "🤝", "color": "#10b981"},
    "pov":              {"label": "POV Shot",                   "icon": "👤", "color": "#06b6d4"},
    "insert":           {"label": "Insert Shot",                "icon": "📌", "color": "#f59e0b"},
    "two-shot":         {"label": "Two Shot",                   "icon": "👥", "color": "#ec4899"},
    "birds-eye":        {"label": "Bird's Eye View",            "icon": "🦅", "color": "#14b8a6"},
    "low-angle":        {"label": "Low Angle",                  "icon": "⬆️", "color": "#6366f1"},
    "high-angle":       {"label": "High Angle",                 "icon": "⬇️", "color": "#a855f7"},
    "dutch-angle":      {"label": "Dutch Angle",                "icon": "↗️", "color": "#e11d48"},
}

IDEA_COLORS = {
    "blue":   "#3b82f6",
    "purple": "#8b5cf6",
    "green":  "#10b981",
    "amber":  "#f59e0b",
    "red":    "#ef4444",
    "pink":   "#ec4899",
}


def _workspace_elements_to_cards(elements):
    """
    Convert workspace element dicts (from canvas JSON state) into
    card dicts suitable for the pitchdeck.html template.
    """
    cards = []
    for el in elements:
        el_type = el.get("type", "")
        if el_type == "shot":
            shot_info = SHOT_TYPE_MAP.get(el.get("shotType", ""), {})
            cards.append({
                "type_label": shot_info.get("label", el.get("shotType", "Shot")),
                "icon": shot_info.get("icon", "🎬"),
                "color": el.get("color", shot_info.get("color", "#3b82f6")),
                "title": el.get("sceneRef", ""),
                "scene_ref": el.get("sceneRef", ""),
                "description": el.get("description", ""),
                "duration": el.get("duration", ""),
                "lens": el.get("lens", ""),
                "movement": el.get("movement", ""),
                "notes": el.get("notes", ""),
                "image_url": el.get("imageUrl", ""),
            })
        elif el_type == "idea":
            cards.append({
                "type_label": "Idea",
                "icon": "💡",
                "color": IDEA_COLORS.get(el.get("color", ""), el.get("color", "#f59e0b")),
                "title": el.get("title", ""),
                "description": "",
                "content": el.get("content", ""),
                "image_url": "",
            })
        elif el_type == "sticky":
            cards.append({
                "type_label": "Note",
                "icon": "📝",
                "color": "#fbbf24",
                "title": "",
                "description": "",
                "content": el.get("content", ""),
                "image_url": "",
            })
        elif el_type == "image":
            cards.append({
                "type_label": "Reference",
                "icon": "🖼",
                "color": "#6366f1",
                "title": el.get("alt", "Image"),
                "description": "",
                "image_url": el.get("src", ""),
            })
        elif el_type == "text":
            content = el.get("content", "").strip()
            if content:
                cards.append({
                    "type_label": "Text",
                    "icon": "📄",
                    "color": "#64748b",
                    "title": "",
                    "description": "",
                    "content": content,
                    "image_url": "",
                })
    return cards


def render_pitchdeck_pdf(script, workspace_state=None):
    """
    Render a Director's Suite Pitch Deck PDF.

    Args:
        script: Script model instance
        workspace_state: dict with 'elements' key (from canvas JSON state).
                        If None, attempts to load from WorkspaceAsset model.

    Returns:
        PDF bytes
    """
    from django.template.loader import render_to_string
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration

    # Gather cards from workspace state
    if workspace_state and workspace_state.get("elements"):
        # Sort by z-index ascending
        elements = sorted(
            workspace_state["elements"],
            key=lambda e: e.get("zIndex", 0)
        )
        cards = _workspace_elements_to_cards(elements)
    else:
        # Fallback: load from WorkspaceAsset model rows
        from scripts.models import WorkspaceAsset
        assets = WorkspaceAsset.objects.filter(script=script).order_by("z_index")
        cards = []
        for asset in assets:
            c = asset.content or {}
            shot_info = SHOT_TYPE_MAP.get(c.get("shotType", ""), {})
            cards.append({
                "type_label": shot_info.get("label", c.get("type_label", asset.asset_type)),
                "icon": shot_info.get("icon", c.get("icon", "🎬")),
                "color": c.get("color", shot_info.get("color", "#3b82f6")),
                "title": c.get("title", c.get("sceneRef", "")),
                "scene_ref": c.get("sceneRef", ""),
                "description": c.get("description", ""),
                "duration": c.get("duration", ""),
                "lens": c.get("lens", ""),
                "movement": c.get("movement", ""),
                "notes": c.get("notes", ""),
                "image_url": c.get("imageUrl", c.get("image_url", "")),
                "content": c.get("content", ""),
            })

    # Chunk into pages of 4 cards (2×2 grid)
    CARDS_PER_PAGE = 4
    card_pages = [
        cards[i:i + CARDS_PER_PAGE]
        for i in range(0, max(len(cards), 1), CARDS_PER_PAGE)
    ]
    if not cards:
        card_pages = [[]]

    context = {
        "title": script.title or "UNTITLED",
        "card_pages": card_pages,
    }

    html_string = render_to_string("pitchdeck.html", context)
    font_config = FontConfiguration()
    html = HTML(string=html_string)
    css = CSS(string=PITCHDECK_CSS, font_config=font_config)

    return html.write_pdf(stylesheets=[css], font_config=font_config)


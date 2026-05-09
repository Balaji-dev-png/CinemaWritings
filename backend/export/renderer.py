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
from weasyprint import CSS, HTML
from weasyprint.text.fonts import FontConfiguration


# ─── WGA Standard Layout Constants ─────────────────────────────────────────
# This CSS is dynamically updated with user preferences
def get_dynamic_css(
    paper_color="#ffffff",
    text_color="#000000",
    font_family="Courier Prime",
    font_size=12,
):
    return f"""
@page {{
    size: letter;
    margin: 1in 1in 1in 1.5in;
    background-color: {paper_color};
    @top-right {{
        content: counter(page) ".";
        font-family: '{font_family}', 'Courier Prime', Courier, monospace;
        font-size: {font_size}pt;
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
    font-family: 'Poppins';
    src: url('https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2') format('woff2');
}}
@font-face {{
    font-family: 'Poppins';
    src: url('https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2') format('woff2');
    font-weight: bold;
}}
@font-face {{
    font-family: 'Inter';
    src: url('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2') format('woff2');
}}
@font-face {{
    font-family: 'Inter';
    src: url('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2') format('woff2');
    font-weight: bold;
}}
@font-face {{
    font-family: 'Roboto';
    src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2') format('woff2');
}}
@font-face {{
    font-family: 'Roboto';
    src: url('https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff2') format('woff2');
    font-weight: bold;
}}
@font-face {{
    font-family: 'Open Sans';
    src: url('https://fonts.gstatic.com/s/opensans/v34/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-muw.woff2') format('woff2');
}}
@font-face {{
    font-family: 'Lato';
    src: url('https://fonts.gstatic.com/s/lato/v23/S6uyw4BMUTPHjx4wXg.woff2') format('woff2');
}}
@font-face {{
    font-family: 'Montserrat';
    src: url('https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm4df9GR7ZtCR7A.woff2') format('woff2');
}}
@font-face {{
    font-family: 'Playfair Display';
    src: url('https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD7K83om0HaPkAt4RYj6u776u776u776u.woff2') format('woff2');
}}
@font-face {{
    font-family: 'Lora';
    src: url('https://fonts.gstatic.com/s/lora/v32/0QI6MX1D_JOuMw3I.woff2') format('woff2');
}}
@font-face {{
    font-family: 'Comic Neue';
    src: url('https://fonts.gstatic.com/s/comicneue/v8/4UaHr6S_T60rk7re7_P7XOvD_w.woff2') format('woff2');
}}

body {{
    font-family: '{font_family}', 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: {font_size}pt;
    line-height: 1.4;
    color: {text_color};
    background-color: {paper_color};
    margin: 0;
    padding: 0;
}}

/* Rich Text Formatting — preserve inline styles from TipTap */
span {{ 
    font-size: inherit; 
    color: inherit;
    background-color: inherit;
    border: none !important; 
    outline: none !important; 
    box-shadow: none !important;
}}
.script-body * {{ border: none !important; outline: none !important; }}
* {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}

/* ─── Title Page ─── */
.title-page {{
    page-break-after: always;
    position: relative;
    height: 9.0in;
    text-align: center;
    font-family: '{font_family}', 'Courier Prime', Courier, monospace;
}}

.title-page .title-block {{
    position: absolute;
    top: 3.5in;
    width: 100%;
    text-align: center;
}}

.title-page .title {{
    font-size: 1.5em;
    font-weight: bold;
    text-transform: uppercase;
    text-decoration: underline;
    margin-bottom: 0.5in;
}}

.title-page .written-by {{
    font-size: 1em;
    margin-bottom: 0.25in;
}}

.title-page .author {{
    font-size: 1.1em;
    font-weight: bold;
}}

.title-page .contact-block {{
    position: absolute;
    bottom: 0;
    left: 0;
    text-align: left;
    font-size: {font_size}pt;
    line-height: 1.4;
}}

/* ─── Script Elements ─── */
.script-body p {{
    margin: 0;
    padding: 0;
    line-height: 1.4;
    font-size: {font_size}pt;
    orphans: 2;
    widows: 2;
    white-space: pre-wrap;
    text-align: inherit;
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
    margin-top: 0.8em;
    margin-bottom: 0.8em;
}}

/* Character Name — matching 35% indent from editor */
.script-body p.character {{
    text-transform: uppercase;
    margin-top: 1.2em;
    margin-left: 2.1in; /* 35% of 6in writing area */
    page-break-after: avoid;
}}

/* Parenthetical — matching 25% indent */
.script-body p.parenthetical {{
    margin-left: 1.5in; /* 25% of 6in */
    max-width: 3.0in;   /* 50% of 6in */
    page-break-after: avoid;
}}

/* Dialogue — matching 17% indents */
.script-body p.dialogue {{
    margin-left: 1.0in; /* 17% of 6in ≈ 1.0in */
    margin-right: 1.0in;
    margin-bottom: 0.6em;
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
    margin-left: 2.1in;
    font-size: 0.9em;
    opacity: 0.7;
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
    import re
    from html.parser import HTMLParser

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
                    # Transformation: Automatic Uppercase for specific types
                    if self.p_class in UPPER_TYPES:
                        content = content.upper()

                    pages[current_page].append(
                        (self.p_class.replace("-", "_"), content)
                    )
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
    from weasyprint import CSS, HTML
    from weasyprint.text.fonts import FontConfiguration

    pages = _parse_html_to_elements(script.content)

    context = {
        "title": script.title or "UNTITLED",
        "written_by_prefix": script.written_by_prefix or "written by",
        "author": script.author or "",
        "contact": script.contact or "",
        "logline": script.logline or "",
        "synopsis": script.synopsis or "",
        "current_date": script.updated_at.strftime("%B-%d-%Y") if hasattr(script, 'updated_at') and script.updated_at else "",
        "pages": pages,
    }

    html_string = render_to_string("screenplay.html", context)
    font_config = FontConfiguration()
    html = HTML(string=html_string)

    dynamic_css = get_dynamic_css(
        paper_color=script.paper_color or "#ffffff",
        text_color=script.text_color or "#000000",
        font_family=script.font_family or "Courier Prime",
        font_size=getattr(script, "font_size", 12),
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
    color: #1e293b;
    background-color: #f8f9fa;
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
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 0.1in;
}
.page-header .project-title {
    font-weight: bold;
    font-size: 10pt;
    color: #64748b;
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
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
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
    background-color: #f1f5f9;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}
.card-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}
.card-image-placeholder {
    text-align: center;
    color: #94a3b8;
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
    color: #0f172a;
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
    color: #334155;
}

.card-notes {
    font-size: 8.5pt;
    color: #475569;
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
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
}
"""

# Shot type metadata map (mirrors frontend SHOT_TYPES)
SHOT_TYPE_MAP = {
    # Distance
    "ews": {"label": "Extreme Wide Shot (EWS)", "icon": "🌍", "color": "#64748b"},
    "ws": {"label": "Wide Shot (WS)", "icon": "🏔", "color": "#64748b"},
    "fs": {"label": "Full Shot (FS)", "icon": "🧍", "color": "#64748b"},
    "mws": {"label": "Medium Wide Shot (MWS)", "icon": "🤠", "color": "#8b5cf6"},
    "ms": {"label": "Medium Shot (MS)", "icon": "👤", "color": "#8b5cf6"},
    "mcu": {"label": "Medium Close-Up (MCU)", "icon": "🗣", "color": "#8b5cf6"},
    "cu": {"label": "Close-Up (CU)", "icon": "👁", "color": "#ef4444"},
    "ecu": {"label": "Extreme Close-Up (ECU)", "icon": "🔍", "color": "#ef4444"},
    "insert": {"label": "Insert Shot", "icon": "📌", "color": "#f59e0b"},
    # Angle
    "eye-level": {"label": "Eye Level", "icon": "👀", "color": "#10b981"},
    "low-angle": {"label": "Low Angle", "icon": "⬆️", "color": "#10b981"},
    "high-angle": {"label": "High Angle", "icon": "⬇️", "color": "#10b981"},
    "birds-eye": {"label": "Bird's Eye / Top Down", "icon": "🦅", "color": "#14b8a6"},
    "dutch-angle": {"label": "Dutch Angle / Canted", "icon": "↗️", "color": "#e11d48"},
    "worms-eye": {"label": "Worm's Eye", "icon": "🐛", "color": "#10b981"},
    # Movement
    "static": {"label": "Static Shot", "icon": "⏸️", "color": "#3b82f6"},
    "pan": {"label": "Pan", "icon": "↔️", "color": "#3b82f6"},
    "tilt": {"label": "Tilt", "icon": "↕️", "color": "#3b82f6"},
    "dolly": {"label": "Dolly / Tracking", "icon": "🚂", "color": "#3b82f6"},
    "dolly-zoom": {"label": "Dolly Zoom (Vertigo)", "icon": "😵‍💫", "color": "#8b5cf6"},
    "zoom": {"label": "Zoom", "icon": "🔎", "color": "#3b82f6"},
    "handheld": {"label": "Handheld", "icon": "🫨", "color": "#f59e0b"},
    "steadicam": {"label": "Steadicam", "icon": "🛹", "color": "#3b82f6"},
    "crane": {"label": "Crane / Jib", "icon": "🏗", "color": "#8b5cf6"},
    "aerial": {"label": "Aerial Shot", "icon": "🚁", "color": "#3b82f6"},
    "arc": {"label": "Arc Shot", "icon": "🔄", "color": "#3b82f6"},
    "whip-pan": {"label": "Whip Pan", "icon": "💨", "color": "#e11d48"},
    # Relationship
    "two-shot": {"label": "Two Shot (2S)", "icon": "👥", "color": "#ec4899"},
    "three-shot": {"label": "Three Shot", "icon": "👪", "color": "#ec4899"},
    "ots": {"label": "Over-the-Shoulder (OTS)", "icon": "👤👤", "color": "#ec4899"},
    "pov": {"label": "Point of View (POV)", "icon": "🎥", "color": "#ec4899"},
    "reaction": {"label": "Reaction Shot", "icon": "😲", "color": "#ec4899"},
    "cutaway": {"label": "Cutaway", "icon": "✂️", "color": "#ec4899"},
    # Special
    "freeze-frame": {"label": "Freeze Frame", "icon": "🧊", "color": "#a855f7"},
    "split-screen": {"label": "Split Screen", "icon": "🪟", "color": "#a855f7"},
    "rack-focus": {"label": "Rack Focus", "icon": "🔬", "color": "#a855f7"},
    "deep-focus": {"label": "Deep Focus", "icon": "🏞", "color": "#a855f7"},
    "shallow-focus": {"label": "Shallow Focus", "icon": "🎯", "color": "#a855f7"},
    "single": {"label": "Single", "icon": "🧍‍♂️", "color": "#ec4899"},
}

IDEA_COLORS = {
    "blue": "#3b82f6",
    "purple": "#8b5cf6",
    "green": "#10b981",
    "amber": "#f59e0b",
    "red": "#ef4444",
    "pink": "#ec4899",
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
            cards.append(
                {
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
                }
            )
        elif el_type == "idea":
            cards.append(
                {
                    "type_label": "Idea",
                    "icon": "💡",
                    "color": IDEA_COLORS.get(
                        el.get("color", ""), el.get("color", "#f59e0b")
                    ),
                    "title": el.get("title", ""),
                    "description": "",
                    "content": el.get("content", ""),
                    "image_url": "",
                }
            )
        elif el_type == "sticky":
            cards.append(
                {
                    "type_label": "Note",
                    "icon": "📝",
                    "color": "#fbbf24",
                    "title": "",
                    "description": "",
                    "content": el.get("content", ""),
                    "image_url": "",
                }
            )
        elif el_type == "image":
            cards.append(
                {
                    "type_label": "Reference",
                    "icon": "🖼",
                    "color": "#6366f1",
                    "title": el.get("alt", "Image"),
                    "description": "",
                    "image_url": el.get("src", ""),
                }
            )
        elif el_type == "text":
            content = el.get("content", "").strip()
            if content:
                cards.append(
                    {
                        "type_label": "Text",
                        "icon": "📄",
                        "color": "#64748b",
                        "title": "",
                        "description": "",
                        "content": content,
                        "image_url": "",
                    }
                )
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
    from weasyprint import CSS, HTML
    from weasyprint.text.fonts import FontConfiguration

    # Gather cards from workspace state
    if workspace_state and workspace_state.get("elements"):
        # Sort by z-index ascending
        elements = sorted(workspace_state["elements"], key=lambda e: e.get("zIndex", 0))
        cards = _workspace_elements_to_cards(elements)
    else:
        # Fallback: load from WorkspaceAsset model rows
        from scripts.models import WorkspaceAsset

        assets = WorkspaceAsset.objects.filter(script=script).order_by("z_index")
        cards = []
        for asset in assets:
            c = asset.content or {}
            shot_info = SHOT_TYPE_MAP.get(c.get("shotType", ""), {})
            cards.append(
                {
                    "type_label": shot_info.get(
                        "label", c.get("type_label", asset.asset_type)
                    ),
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
                }
            )

    # Chunk into pages of 4 cards (2×2 grid)
    CARDS_PER_PAGE = 4
    card_pages = [
        cards[i : i + CARDS_PER_PAGE]
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

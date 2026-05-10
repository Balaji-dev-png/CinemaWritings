"""
WeasyPrint-based PDF renderer for screenplays.

Converts a Script model instance into a WGA-standard PDF with:
  - 1.5" left margin (binding), 1" right/top/bottom
  - Courier Prime 12pt, 1.2 line-height
  - Title page: block-level with absolute positioning, forced page break
  - Proper element indentation per WGA / Hollywood standards
"""

import io
from datetime import date

from django.template.loader import render_to_string
from weasyprint import CSS, HTML
from weasyprint.text.fonts import FontConfiguration


def ordinal(n):
    suffix = ['th','st','nd','rd','th','th','th','th','th','th']
    return str(n) + (suffix[n % 10] if n % 10 < 4 and not (11 <= n % 100 <= 13) else 'th')


# ─── WGA Standard Layout Constants ─────────────────────────────────────────
# This CSS is dynamically updated with user preferences
def get_dynamic_css(
    paper_color="#ffffff",
    text_color="#000000",
    font_family="Courier Prime",
    font_size=12,
):
    return f"""
/* Script pages — always white */
@page {{
    size: letter;
    margin: 1in 1in 1in 1.5in;
    background-color: #ffffff;
    @top-right {{
        content: counter(page) ".";
        font-family: '{font_family}', 'Courier Prime', Courier, monospace;
        font-size: {font_size}pt;
        vertical-align: bottom;
        padding-bottom: 0.5in;
        color: #000000;
    }}
}}

/* Title page — dark background, no page number */
@page :first {{
    background-color: #1a1a1a;
    @top-right {{ content: none; }}
}}

/* Force print backgrounds — critical for dark title page */
* {{
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
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

body {{
    font-family: '{font_family}', 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: {font_size}pt;
    line-height: 1.4;
    color: {text_color};
    background-color: #ffffff;
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

.no-print {{
    display: none !important;
}}

/* ─── Title Page ─── */
.title-page {{
    page-break-after: always;
    position: relative;
    height: 9.0in;
    text-align: center;
    font-family: '{font_family}', 'Courier Prime', Courier, monospace;
    background-color: #1a1a1a;
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
    color: #c9a84c;  /* gold — matches screen */
    letter-spacing: 0.05em;
}}

.title-page .written-by {{
    font-size: 1em;
    margin-bottom: 0.25in;
    color: #888888;
}}

.title-page .author {{
    font-size: 1.1em;
    font-weight: normal;
    color: #aaaaaa;
}}

.title-page .logline-block {{
    position: absolute;
    top: 5.5in;
    width: 100%;
    text-align: center;
    padding: 0 1in;
}}
.title-page .logline {{
    font-style: italic;
    color: #888888;
    margin-bottom: 0.2in;
}}
.title-page .synopsis {{
    font-size: 0.9em;
    color: #666666;
}}

.title-page .contact-block {{
    position: absolute;
    bottom: 0;
    left: 0;
    text-align: left;
    font-size: {font_size}pt;
    line-height: 1.6;
    color: #666666;
}}

/* ─── Script Body ─── */
.script-body {{
    background-color: #ffffff;
    color: #000000;
}}

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

/* Images inserted inline via the editor */
.script-image {{
    margin: 12pt 0;
    line-height: 0;
}}
.script-image.align-center {{
    text-align: center;
}}
.script-image.align-right {{
    text-align: right;
}}
.script-image img {{
    max-width: 100%;
    height: auto;
    display: inline-block;
    border: none !important;
    outline: none !important;
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
            self.in_image_wrapper = False
            self.image_align = 'left'
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

            # Detect image wrapper div (rendered by ResizableImage.renderHTML)
            if tag == "div":
                cls = attrs_dict.get("class", "")
                if "script-image-wrapper" in cls:
                    self.in_image_wrapper = True
                    self.image_align = "center" if "align-center" in cls else "right" if "align-right" in cls else "left"
                    return

            # Capture <img> inside an image wrapper
            if tag == "img" and self.in_image_wrapper:
                src = attrs_dict.get("src", "")
                style = attrs_dict.get("style", "")
                width_match = re.search(r'width:\s*(\d+)px', style)
                width = width_match.group(1) if width_match else "400"
                if src:
                    html_str = (
                        f'<div class="script-image align-{self.image_align}">'
                        f'<img src="{src}" style="width:{width}px;max-width:100%;height:auto;" />'
                        f'</div>'
                    )
                    pages[current_page].append(('image', html_str))
                return

            if tag == "p":
                self.in_p = True
                self.p_class = attrs_dict.get("class", "action")
                self.p_html_parts = []
            elif self.in_p:
                attr_str = "".join([f' {k}="{v}"' for k, v in attrs])
                self.p_html_parts.append(f"<{tag}{attr_str}>")

        def handle_endtag(self, tag):
            if tag == "div":
                if self.in_image_wrapper:
                    self.in_image_wrapper = False
                    return
                if self.in_page_node:
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

    today = date.today()
    formatted_date = f"{today.strftime('%B')}-{ordinal(today.day)}-{today.year}"

    context = {
        "title": script.title or "UNTITLED",
        "written_by_prefix": script.written_by_prefix or "written by",
        "author": script.author or "",
        "contact": script.contact or "",
        "logline": script.logline or "",
        "synopsis": script.synopsis or "",
        "current_date": formatted_date,
        "pages": pages,
        "show_logline": bool(script.logline and script.logline.strip()),
        "show_synopsis": bool(script.synopsis and script.synopsis.strip()),
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



def render_screenplay_pdf_from_html(script, body: dict) -> bytes:
    """
    WYSIWYG PDF export — uses actual TipTap HTML output so every
    user edit (font size, color, letter spacing, alignment) is preserved exactly.
    """
    from weasyprint import CSS, HTML
    from weasyprint.text.fonts import FontConfiguration
    import datetime

    # Pull values from POST body
    title_page_html = body.get('title_page_html', '')
    script_body_html = body.get('script_body_html', '')
    font_family = body.get('font_family', 'Courier Prime')
    font_size = body.get('font_size', 12)
    paper_color = body.get('paper_color', '#ffffff')
    text_color = body.get('text_color', '#000000')
    title_page_bg = body.get('title_page_bg', '#1a1a1a')
    title_color = body.get('title_color', '#c9a84c')

    # Format date
    today = datetime.date.today()
    suffix = lambda n: 'th' if 11<=n%100<=13 else {1:'st',2:'nd',3:'rd'}.get(n%10,'th')
    formatted_date = f"{today.strftime('%B')}-{today.day}{suffix(today.day)}-{today.year}"

    # Build complete HTML document
    html_string = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
</head>
<body>

<!-- TITLE PAGE -->
<div class="title-page">
    <div class="title-page-inner">
        {title_page_html if title_page_html else _build_fallback_title_html(script, title_color)}
    </div>
    <div class="title-page-date">{formatted_date}</div>
</div>

<!-- SCRIPT BODY -->
<div class="script-body">
    {script_body_html if script_body_html else ''}
</div>

</body>
</html>"""

    css_string = _build_wysiwyg_css(
        font_family=font_family,
        font_size=font_size,
        paper_color=paper_color,
        text_color=text_color,
        title_page_bg=title_page_bg,
        title_color=title_color,
    )

    font_config = FontConfiguration()
    html = HTML(string=html_string)
    css = CSS(string=css_string, font_config=font_config)
    return html.write_pdf(stylesheets=[css], font_config=font_config)


def _build_fallback_title_html(script, title_color: str) -> str:
    """Fallback if frontend sends no title_page_html."""
    return f"""
        <div class="fallback-title">{script.title or 'UNTITLED'}</div>
        <div class="fallback-written-by">{script.written_by_prefix or 'written by'}</div>
        <div class="fallback-author">{script.author or ''}</div>
    """


def _build_wysiwyg_css(
    font_family: str,
    font_size: int,
    paper_color: str,
    text_color: str,
    title_page_bg: str,
    title_color: str,
) -> str:
    return f"""
/* ── Font Faces ── */
@font-face {{
    font-family: 'Courier Prime';
    src: url('https://fonts.gstatic.com/s/courierprime/v9/u-4n0qW6p57vka8V2WnLpNeVfE8.woff2') format('woff2');
    font-weight: normal;
}}
@font-face {{
    font-family: 'Courier Prime';
    src: url('https://fonts.gstatic.com/s/courierprime/v9/u-4k0qW6p57vka8V2WhD9eRfYfg.woff2') format('woff2');
    font-weight: bold;
}}
@font-face {{
    font-family: 'Courier Prime';
    src: url('https://fonts.gstatic.com/s/courierprime/v9/u-450qW6p57vka8V2WnLpNhFjW5.woff2') format('woff2');
    font-style: italic;
}}

/* ── Page Rules ── */
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
        color: {text_color};
    }}
}}

@page :first {{
    background-color: {title_page_bg};
    margin: 0;
    @top-right {{ content: none; }}
}}

/* ── Global Reset ── */
* {{
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box;
}}

body {{
    font-family: '{font_family}', 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: {font_size}pt;
    line-height: 1.4;
    margin: 0;
    padding: 0;
}}

/* ── Preserve ALL inline styles from TipTap ── */
/* This is the key — never override inline styles */
[style] {{
    /* inline styles always win — do not override */
}}

span {{
    /* preserve font-size, color, letter-spacing, etc from TipTap */
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
}}

/* ── Title Page ── */
.title-page {{
    page-break-after: always;
    background-color: {title_page_bg};
    width: 100%;
    min-height: 100vh;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1in;
}}

.title-page-inner {{
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.3in;
    margin-top: 2in;
}}

/* Title text — gold, uppercase, underlined, letter-spaced */
.title-page-inner .script-title,
.fallback-title {{
    font-family: '{font_family}', 'Courier Prime', Courier, monospace;
    font-size: 18pt;
    font-weight: bold;
    text-transform: uppercase;
    text-decoration: underline;
    color: {title_color};
    letter-spacing: 0.12em;
    text-align: center;
    margin-bottom: 0.4in;
}}

/* "written by" */
.title-page-inner .written-by,
.fallback-written-by {{
    font-family: '{font_family}', 'Courier Prime', Courier, monospace;
    font-size: {font_size}pt;
    color: #888888;
    letter-spacing: 0.05em;
    text-align: center;
    margin-bottom: 0.1in;
}}

/* Author name */
.title-page-inner .author-name,
.fallback-author {{
    font-family: '{font_family}', 'Courier Prime', Courier, monospace;
    font-size: {font_size}pt;
    color: #aaaaaa;
    letter-spacing: 0.05em;
    text-align: center;
}}

/* Hide UI-only elements from PDF */
.no-print,
.show-logline-btn,
[data-no-print],
button {{
    display: none !important;
}}

/* Date bottom left of title page */
.title-page-date {{
    position: absolute;
    bottom: 0.5in;
    left: 1in;
    font-family: '{font_family}', 'Courier Prime', Courier, monospace;
    font-size: 9pt;
    color: #555555;
    letter-spacing: 0.05em;
}}

/* Contact info */
.contact-block,
.title-page-inner .contact {{
    position: absolute;
    bottom: 0.8in;
    left: 1in;
    font-family: '{font_family}', 'Courier Prime', Courier, monospace;
    font-size: 9pt;
    color: #666666;
    line-height: 1.6;
    text-align: left;
}}

/* ── Script Body ── */
.script-body {{
    background-color: {paper_color};
    color: {text_color};
}}

.script-body p {{
    margin: 0;
    padding: 0;
    line-height: 1.4;
    font-size: {font_size}pt;
    orphans: 2;
    widows: 2;
    white-space: pre-wrap;
}}

/* ── WGA Element Styles ── */
.script-body p.scene-heading,
.script-body p.scene_heading {{
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 1.2em;
    margin-bottom: 0.4em;
    page-break-after: avoid;
}}

.script-body p.action {{
    margin-top: 0.8em;
    margin-bottom: 0.8em;
}}

.script-body p.character {{
    text-transform: uppercase;
    margin-top: 1.2em;
    margin-left: 2.1in;
    page-break-after: avoid;
}}

.script-body p.parenthetical {{
    margin-left: 1.5in;
    max-width: 3.0in;
    page-break-after: avoid;
}}

.script-body p.dialogue {{
    margin-left: 1.0in;
    margin-right: 1.0in;
    margin-bottom: 0.6em;
}}

.script-body p.transition {{
    text-transform: uppercase;
    text-align: right;
    margin-top: 1em;
    margin-bottom: 1em;
}}

.script-body p.shot {{
    text-transform: uppercase;
    margin-top: 1em;
    margin-bottom: 1em;
}}

/* ── Text Formatting — preserved from TipTap inline styles ── */
strong, b {{ font-weight: bold; }}
em, i {{ font-style: italic; }}
u {{ text-decoration: underline; }}
s {{ text-decoration: line-through; }}

/* ── Images in script ── */
.script-image-wrapper {{
    margin: 12pt 0;
    line-height: 0;
}}
.script-image-wrapper.align-center {{
    text-align: center;
}}
.script-image-wrapper.align-right {{
    text-align: right;
}}
.script-image-wrapper img {{
    max-width: 100%;
    height: auto;
    display: inline-block;
    border: none !important;
}}

/* ── Script Pages ── */
.script-page {{
    page-break-after: always;
    background-color: {paper_color};
}}
.script-page:last-child {{
    page-break-after: auto;
}}
"""

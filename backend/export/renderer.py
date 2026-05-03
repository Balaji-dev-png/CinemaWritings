"""
WeasyPrint-based PDF renderer for screenplays.

Converts a Script model instance into a WGA-standard PDF with:
  - 1.5" left margin (binding), 1" right/top/bottom
  - Courier Prime 12pt, 6 lines per inch
  - Title page: title 4" from top, centered
  - Proper element indentation per WGA standards
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
    margin: 1in 1in 1in 1.5in;
    background-color: {paper_color};
}}

@page title_page {{
    size: letter;
    margin: 1in;
    background-color: {paper_color};
}}

@font-face {{
    font-family: 'Courier Prime';
    src: local('Courier Prime'), local('CourierPrime'), local('Courier');
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
s, strike, del {{ text-decoration: line-through; }}

/* ─── Title Page ─── */
.title-page {{
    page: title_page;
    page-break-after: always;
    text-align: center;
    position: relative;
    height: 9in;
}}

.title-page .title-block {{
    padding-top: 3in;
}}

.title-page .title {{
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}}

.title-page .written-by {{
    margin-top: 24pt;
    font-size: 12pt;
}}

.title-page .author {{
    margin-top: 24pt;
    font-size: 12pt;
}}

.title-page .logline-block {{
    margin-top: 48pt;
    text-align: center;
}}

.title-page .logline-label {{
    font-weight: bold;
    font-size: 12pt;
    margin-bottom: 12pt;
}}

.title-page .logline-text {{
    font-size: 12pt;
    max-width: 5in;
    margin: 0 auto;
    text-align: center;
}}

.title-page .synopsis-block {{
    margin-top: 48pt;
    text-align: center;
}}

.title-page .synopsis-label {{
    font-weight: bold;
    font-size: 12pt;
    margin-bottom: 12pt;
}}

.title-page .synopsis-text {{
    font-size: 12pt;
    max-width: 5in;
    margin: 0 auto;
    text-align: center;
}}

.title-page .contact-block {{
    position: absolute;
    bottom: 0;
    left: 0;
    text-align: left;
    font-size: 12pt;
    line-height: 1.4;
}}

/* ─── Script Elements ─── */
.script-body {{
    page: auto;
}}

.script-body p {{
    margin: 0;
    padding: 0;
    line-height: 1.2;
    font-size: 12pt;
    orphans: 2;
    widows: 2;
}}

/* Scene Heading */
.script-body p.scene-heading {{
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 12pt;
    margin-bottom: 6pt;
    margin-left: 0;
    margin-right: 0;
    page-break-after: avoid;
}}

/* Action */
.script-body p.action {{
    margin-top: 6pt;
    margin-bottom: 6pt;
    margin-left: 0;
    margin-right: 0;
}}

/* Character Name */
.script-body p.character {{
    text-transform: uppercase;
    margin-top: 12pt;
    margin-left: 2.2in;
    page-break-after: avoid;
}}

/* Parenthetical */
.script-body p.parenthetical {{
    margin-left: 1.5in;
    max-width: 2.5in;
    page-break-before: avoid;
    page-break-after: avoid;
}}

/* Dialogue */
.script-body p.dialogue {{
    margin-left: 1.0in;
    max-width: 3.5in;
    margin-bottom: 6pt;
    page-break-before: avoid;
}}

/* Transition */
.script-body p.transition {{
    text-transform: uppercase;
    text-align: right;
    margin-top: 12pt;
    margin-bottom: 12pt;
}}

/* Shot */
.script-body p.shot {{
    text-transform: uppercase;
    margin-top: 6pt;
    margin-bottom: 6pt;
}}

/* Extension (V.O./O.S.) */
.script-body p.extension {{
    text-transform: uppercase;
    margin-left: 2.2in;
}}
"""


def _parse_html_to_elements(html_content):
    """
    Parse TipTap HTML output into a list of (type, html_content) tuples.
    """
    from html.parser import HTMLParser

    elements = []
    current_type = "action"
    current_content_parts = []

    KNOWN_TYPES = {
        "scene-heading", "action", "character", "dialogue",
        "parenthetical", "transition", "shot", "extension",
    }

    class ScriptHTMLParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.in_p = False
            self.p_class = "action"
            self.p_html_parts = []

        def handle_starttag(self, tag, attrs):
            if tag == "p":
                self.in_p = True
                attrs_dict = dict(attrs)
                cls = attrs_dict.get("class", "action")
                self.p_class = "action"
                for c in cls.split():
                    if c in KNOWN_TYPES:
                        self.p_class = c
                        break
                self.p_html_parts = []
            elif self.in_p:
                attr_str = ""
                for k, v in attrs:
                    attr_str += f' {k}="{v}"'
                self.p_html_parts.append(f"<{tag}{attr_str}>")

        def handle_endtag(self, tag):
            if tag == "p" and self.in_p:
                self.in_p = False
                content = "".join(self.p_html_parts).strip()
                if content:
                    elements.append((self.p_class, content))
            elif self.in_p:
                self.p_html_parts.append(f"</{tag}>")

        def handle_data(self, data):
            if self.in_p:
                self.p_html_parts.append(data)

    parser = ScriptHTMLParser()
    parser.feed(html_content or "")
    return elements


def render_screenplay_pdf(script):
    """
    Render a Script model instance to PDF bytes using WeasyPrint.
    """
    # Parse the HTML content into typed elements
    elements = _parse_html_to_elements(script.content)

    # Build template context
    context = {
        "title": script.title or "UNTITLED",
        "written_by_prefix": script.written_by_prefix or "written by",
        "author": script.author or "",
        "contact": script.contact or "",
        "logline": script.logline or "",
        "synopsis": script.synopsis or "",
        "elements": elements,
    }

    # Render HTML from Django template
    html_string = render_to_string("screenplay.html", context)

    # Generate PDF with WeasyPrint
    font_config = FontConfiguration()
    html = HTML(string=html_string)
    
    # Get dynamic CSS based on script styling
    dynamic_css = get_dynamic_css(
        paper_color=script.paper_color or "#ffffff",
        text_color=script.text_color or "#000000",
        font_family=script.font_family or "Courier Prime"
    )
    css = CSS(string=dynamic_css, font_config=font_config)

    pdf_bytes = html.write_pdf(
        stylesheets=[css],
        font_config=font_config,
    )

    return pdf_bytes

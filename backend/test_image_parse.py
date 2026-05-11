import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cinemawritings.settings")
django.setup()

from export.renderer import _parse_html_to_elements

html = """
<div data-type="pageNode" class="script-page">
    <p class="scene-heading">INT. LOCATION - DAY</p>
    <div class="script-image-wrapper align-center">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" alt="test" style="width:400px;height:auto;max-width:100%;display:inline-block;" draggable="false">
    </div>
    <p class="action">Some action text.</p>
</div>
"""

pages = _parse_html_to_elements(html)
print("Pages:")
for i, page in enumerate(pages):
    print(f"Page {i}:")
    for el_type, content in page:
        print(f"  [{el_type}] {content[:100]}")

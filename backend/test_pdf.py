import os
import sys
import django

sys.path.append('/home/balaji/Documents/VibeWriting/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cinemawritings.settings")
django.setup()

from scripts.models import Script
from export.renderer import render_screenplay_pdf

try:
    script = Script.objects.first()
    if script:
        script.content = '<p class="scene-heading" style="color: lab(0% 0 0)">INT. LAB COLOR TEST - DAY</p>'
        pdf_bytes = render_screenplay_pdf(script)
        print(f"Success, rendered PDF of size {len(pdf_bytes)}")
except Exception as e:
    import traceback
    traceback.print_exc()

import os
import sys
import django

sys.path.append('/home/balaji/Documents/VibeWriting/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cinemawritings.settings")
django.setup()

from scripts.models import Script
from export.renderer import render_screenplay_pdf

script = Script.objects.first()
pdf_bytes = render_screenplay_pdf(script)
with open('/home/balaji/Documents/VibeWriting/test_output.pdf', 'wb') as f:
    f.write(pdf_bytes)
print("Saved to test_output.pdf")

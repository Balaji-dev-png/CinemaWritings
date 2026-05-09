import os, sys, django
sys.path.append('/home/balaji/Documents/VibeWriting/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cinemawritings.settings")
django.setup()

from scripts.models import Script
from export.renderer import render_screenplay_pdf

script = Script.objects.filter(id="c87113f4-05f6-4970-96ec-0ee7e8375d29").first()
if script:
    print(f"Found script. Content length: {len(script.content)}")
    try:
        pdf_bytes = render_screenplay_pdf(script)
        print(f"Success. PDF size: {len(pdf_bytes)}")
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print("Script not found")

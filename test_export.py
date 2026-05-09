import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cinemawritings.settings")
django.setup()

from scripts.models import Script
from export.renderer import render_screenplay_pdf

script = Script.objects.first()
if script:
    try:
        render_screenplay_pdf(script)
        print("Success")
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print("No script found")

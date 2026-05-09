import os
import sys
import django
from django.test.client import RequestFactory

sys.path.append('/home/balaji/Documents/VibeWriting/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cinemawritings.settings")
django.setup()

from scripts.views import ScriptViewSet
from scripts.models import Script
from django.http import Http404

factory = RequestFactory()
request = factory.post(
    f'/api/scripts/c87113f4-05f6-4970-96ec-0ee7e8375d29/export/pdf/', 
    {'content': '<p>test direct</p>', 'title': 'My Direct Script'}, 
    content_type='application/json'
)

# Manually execute the exact logic in export_pdf
pk = "c87113f4-05f6-4970-96ec-0ee7e8375d29"
try:
    script = Script.objects.get(pk=pk)
except Script.DoesNotExist:
    script = Script(id=pk)

script.content = request.data.get("content", script.content)
script.title = request.data.get("title", script.title)
script.paper_color = request.data.get("paper_color", script.paper_color)
script.font_family = request.data.get("font_family", script.font_family)
script.text_color = request.data.get("text_color", script.text_color)
script.font_size = request.data.get("font_size", script.font_size)

from export.renderer import render_screenplay_pdf
try:
    pdf_bytes = render_screenplay_pdf(script)
    print(f"Success! Generated PDF of size {len(pdf_bytes)}")
except Exception as e:
    import traceback
    traceback.print_exc()

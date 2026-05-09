import os
import sys
import django
from django.test.client import RequestFactory

sys.path.append('/home/balaji/Documents/VibeWriting/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cinemawritings.settings")
django.setup()

from scripts.views import ScriptViewSet
from scripts.models import Script

script = Script.objects.first()
factory = RequestFactory()
request = factory.post(f'/api/scripts/{script.id}/export/pdf/', {'content': '<p>test</p>', 'title': 'test'}, content_type='application/json')
# We must attach a user or mock the authentication if it requires it, but viewset might just need the request
# Actually, let's bypass auth for testing by removing permission_classes just for the test
view = ScriptViewSet.as_view({'post': 'export_pdf'})

# Mock user to bypass IsAuthenticated
class MockUser:
    is_authenticated = True
request.user = MockUser()

response = view(request, pk=script.id)
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print(f"Content Length: {len(response.content)}")
else:
    print(f"Response: {response.content}")

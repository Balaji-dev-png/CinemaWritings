import os
import sys
import django
from django.test.client import RequestFactory

sys.path.append('/home/balaji/Documents/VibeWriting/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cinemawritings.settings")
django.setup()

from scripts.views import ScriptViewSet

factory = RequestFactory()
# Send a POST request to the export_pdf endpoint with the user's script ID
request = factory.post(
    f'/api/scripts/c87113f4-05f6-4970-96ec-0ee7e8375d29/export/pdf/', 
    {'content': '<p>test</p>', 'title': 'My Mock Script'}, 
    content_type='application/json'
)

# Bypass DRF permissions
class MockUser:
    is_authenticated = True
    id = "mock-user-id"
request.user = MockUser()

view = ScriptViewSet.as_view({'post': 'export_pdf'})

# Since we are calling the view directly, DRF's authentication classes might still run.
# Let's monkey-patch the view to allow any
from rest_framework.permissions import AllowAny
view.view_class.permission_classes = [AllowAny]
view.view_class.authentication_classes = []

try:
    response = view(request, pk="c87113f4-05f6-4970-96ec-0ee7e8375d29")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print(f"Success! Content-Disposition: {response['Content-Disposition']}")
        print(f"Content Length: {len(response.content)}")
    else:
        print(f"Error Content: {response.content}")
except Exception as e:
    import traceback
    traceback.print_exc()

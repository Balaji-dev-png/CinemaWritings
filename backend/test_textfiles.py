import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cinemawritings.settings")
django.setup()
from rest_framework.test import APIClient
from scripts.models import TextFile
from django.contrib.auth.models import User

client = APIClient()
user = User.objects.first()
if not user:
    user = User.objects.create(username="test")
client.force_authenticate(user=user)
resp = client.get('/api/text-files/')
print(resp.status_code)
print(resp.json())

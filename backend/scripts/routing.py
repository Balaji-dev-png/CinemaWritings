"""
WebSocket URL routing for Django Channels.
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r"ws/scripts/(?P<script_id>[0-9a-f-]+)/$",
        consumers.ScriptConsumer.as_asgi(),
    ),
]

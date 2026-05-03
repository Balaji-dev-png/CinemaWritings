"""
WebSocket consumer for real-time screenplay collaboration.

Each script gets its own channel group (script_{id}).
Connected clients receive live updates when any collaborator edits.
"""
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async


class ScriptConsumer(AsyncJsonWebsocketConsumer):
    """
    Handles WebSocket connections for a single screenplay document.

    Supported message types (from client):
      - cursor_move: {type, user, position}
      - content_update: {type, content, timestamp}
      - element_update: {type, elementId, elementType, content, order}
      - element_insert: {type, afterElementId, elementType, content}
      - element_delete: {type, elementId}
      - user_join: {type, user}
      - user_leave: {type, user}
    """

    async def connect(self):
        self.script_id = self.scope["url_route"]["kwargs"]["script_id"]
        self.room_group_name = f"script_{self.script_id}"
        self.user_id = self.scope.get("user", {})

        # Join the script's channel group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()

        # Notify others that a new user has joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_joined",
                "channel": self.channel_name,
                "message": "A collaborator has joined.",
            },
        )

    async def disconnect(self, close_code):
        # Notify others that a user has left
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_left",
                "channel": self.channel_name,
                "message": "A collaborator has left.",
            },
        )
        # Leave the group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive_json(self, content, **kwargs):
        """Route incoming messages to the group, excluding sender."""
        msg_type = content.get("type", "unknown")

        # Persist content updates to the database
        if msg_type == "content_update":
            await self._save_content(content.get("content", ""))

        # Broadcast to all other clients in the group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_message",
                "sender_channel": self.channel_name,
                "payload": content,
            },
        )

    # ── Group message handlers ────────────────────────────────────────

    async def broadcast_message(self, event):
        """Forward a message to the client, skipping the sender."""
        if event.get("sender_channel") == self.channel_name:
            return  # Don't echo back to sender
        await self.send_json(event["payload"])

    async def user_joined(self, event):
        if event.get("channel") == self.channel_name:
            return
        await self.send_json({
            "type": "user_joined",
            "message": event["message"],
        })

    async def user_left(self, event):
        if event.get("channel") == self.channel_name:
            return
        await self.send_json({
            "type": "user_left",
            "message": event["message"],
        })

    # ── Database helpers ──────────────────────────────────────────────

    @database_sync_to_async
    def _save_content(self, content):
        """Persist the full HTML content to the Script model."""
        from scripts.models import Script
        try:
            script = Script.objects.get(pk=self.script_id)
            script.content = content
            script.save(update_fields=["content", "updated_at"])
        except Script.DoesNotExist:
            pass

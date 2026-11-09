import json
from typing import Any

from app.models import Conversation, Message, UserSettings


def message_to_dict(message: Message) -> dict[str, Any]:
    metadata = None
    if message.metadata_json:
        try:
            metadata = json.loads(message.metadata_json)
        except json.JSONDecodeError:
            metadata = None
    return {
        "id": message.id,
        "conversationId": message.conversation_id,
        "role": message.role,
        "content": message.content,
        "contentType": message.content_type,
        "metadata": metadata,
        "createdAt": message.created_at.isoformat() if message.created_at else None,
    }


def conversation_summary(conversation: Conversation, message_count: int) -> dict[str, Any]:
    return {
        "id": conversation.id,
        "title": conversation.title,
        "archived": conversation.archived,
        "createdAt": conversation.created_at.isoformat() if conversation.created_at else None,
        "updatedAt": conversation.updated_at.isoformat() if conversation.updated_at else None,
        "messageCount": message_count,
    }


def conversation_detail(conversation: Conversation) -> dict[str, Any]:
    return {
        "id": conversation.id,
        "title": conversation.title,
        "archived": conversation.archived,
        "createdAt": conversation.created_at.isoformat() if conversation.created_at else None,
        "updatedAt": conversation.updated_at.isoformat() if conversation.updated_at else None,
        "messages": [message_to_dict(m) for m in conversation.messages],
    }


def settings_payload(settings: UserSettings | None, *, name: str, email: str) -> dict[str, Any]:
    base = {
        "theme": "system",
        "modelPreference": "gpt-4o-mini",
        "systemPrompt": "You are a helpful assistant.",
        "streamResponses": True,
        "showTimestamps": True,
    }
    if settings:
        base = {
            "id": settings.id,
            "theme": settings.theme,
            "modelPreference": settings.model_preference,
            "systemPrompt": settings.system_prompt,
            "streamResponses": settings.stream_responses,
            "showTimestamps": settings.show_timestamps,
        }
    return {**base, "name": name, "email": email}


def user_to_dict(user) -> dict[str, Any]:  # type: ignore[no-untyped-def]
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
    }

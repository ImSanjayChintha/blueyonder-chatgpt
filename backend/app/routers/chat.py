import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.cache import cache
from app.config import get_settings
from app.database import get_db
from app.llm import action_to_prompt, generate_reply
from app.models import Conversation, Message, User, UserSettings
from app.schemas import ChatSendRequest
from app.serializers import message_to_dict

router = APIRouter(prefix="/api/chat", tags=["chat"])
settings = get_settings()


def title_from_prompt(prompt: str) -> str:
    cleaned = " ".join(prompt.split()).strip()
    return f"{cleaned[:48]}…" if len(cleaned) > 48 else cleaned or "New chat"


def sse(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@router.post("/stream")
async def stream_chat(
    body: ChatSendRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    content = action_to_prompt(body.action_id) if body.action_id else body.content
    conversation_id = body.conversation_id

    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()

    conversation: Conversation | None = None
    if conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(user_id=user.id, title=title_from_prompt(content))
        db.add(conversation)
        db.flush()

    if conversation.title == "New chat":
        conversation.title = title_from_prompt(content)

    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=content,
        content_type="markdown",
    )
    db.add(user_message)
    db.commit()
    db.refresh(conversation)
    db.refresh(user_message)
    cache.invalidate_prefix(f"conversations:{user.id}")

    history = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
        .limit(40)
        .all()
    )

    conv_id = conversation.id
    conv_title = conversation.title
    user_msg_payload = message_to_dict(user_message)
    history_payload = [{"role": m.role, "content": m.content} for m in history]
    model_pref = user_settings.model_preference if user_settings else None
    system_prompt = user_settings.system_prompt if user_settings else None
    user_id = user.id

    async def event_stream() -> AsyncGenerator[str, None]:
        yield sse(
            "meta",
            {
                "conversationId": conv_id,
                "conversationTitle": conv_title,
                "userMessage": user_msg_payload,
            },
        )

        full_content = ""
        metadata = None

        try:
            async for chunk in generate_reply(
                history_payload,
                model=model_pref,
                system_prompt=system_prompt,
                api_key=settings.openai_api_key,
                default_model=settings.openai_model,
                image_model=settings.openai_image_model,
            ):
                chunk_type = chunk.get("type")
                if chunk_type == "token" and chunk.get("content"):
                    full_content += chunk["content"]
                    yield sse("token", {"content": chunk["content"]})
                elif chunk_type == "rich" and chunk.get("metadata"):
                    metadata = chunk["metadata"]
                    yield sse("rich", {"metadata": metadata})
                elif chunk_type == "error":
                    yield sse("error", {"message": chunk.get("content", "Stream failed")})
                    return
                elif chunk_type == "done":
                    break

            assistant = Message(
                conversation_id=conv_id,
                role="assistant",
                content=full_content or "(no response)",
                content_type="markdown",
                metadata_json=json.dumps(metadata) if metadata else None,
            )
            db.add(assistant)
            conv = db.get(Conversation, conv_id)
            if conv:
                # touch updated_at
                from app.models import utcnow

                conv.updated_at = utcnow()
            db.commit()
            db.refresh(assistant)
            cache.invalidate_prefix(f"conversations:{user_id}")
            yield sse("done", {"message": message_to_dict(assistant)})
        except Exception as exc:  # noqa: BLE001
            yield sse("error", {"message": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/send")
async def send_chat(
    body: ChatSendRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    content = action_to_prompt(body.action_id) if body.action_id else body.content

    conversation: Conversation | None = None
    if body.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == body.conversation_id, Conversation.user_id == user.id)
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(user_id=user.id, title=title_from_prompt(content))
        db.add(conversation)
        db.flush()

    db.add(
        Message(
            conversation_id=conversation.id,
            role="user",
            content=content,
            content_type="markdown",
        )
    )
    db.commit()

    history = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()

    full_content = ""
    metadata = None
    async for chunk in generate_reply(
        [{"role": m.role, "content": m.content} for m in history],
        model=user_settings.model_preference if user_settings else None,
        system_prompt=user_settings.system_prompt if user_settings else None,
        api_key=settings.openai_api_key,
        default_model=settings.openai_model,
        image_model=settings.openai_image_model,
    ):
        if chunk.get("type") == "token" and chunk.get("content"):
            full_content += chunk["content"]
        elif chunk.get("type") == "rich":
            metadata = chunk.get("metadata")

    assistant = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=full_content or "(no response)",
        content_type="markdown",
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(assistant)
    db.commit()
    db.refresh(assistant)
    cache.invalidate_prefix(f"conversations:{user.id}")

    return {
        "conversationId": conversation.id,
        "message": message_to_dict(assistant),
    }

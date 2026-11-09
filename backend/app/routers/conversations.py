from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.cache import cache
from app.database import get_db
from app.models import Conversation, Message, User
from app.schemas import ConversationCreate, ConversationUpdate
from app.serializers import conversation_detail, conversation_summary

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("/")
def list_conversations(
    q: str = Query(default=""),
    archived: bool = Query(default=False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    query = (q or "").strip()
    cache_key = f"conversations:{user.id}:{query}:{archived}"

    if not query:
        cached = cache.get(cache_key)
        if cached is not None:
            return {"conversations": cached, "cached": True}

    stmt = (
        db.query(Conversation, func.count(Message.id).label("message_count"))
        .outerjoin(Message, Message.conversation_id == Conversation.id)
        .filter(Conversation.user_id == user.id, Conversation.archived == archived)
        .group_by(Conversation.id)
        .order_by(Conversation.updated_at.desc())
    )

    if query:
        stmt = stmt.filter(
            or_(
                Conversation.title.contains(query),
                Conversation.id.in_(
                    db.query(Message.conversation_id)
                    .filter(Message.content.contains(query))
                    .distinct()
                ),
            )
        )

    rows = stmt.all()
    conversations = [conversation_summary(conv, count) for conv, count in rows]

    if not query:
        cache.set(cache_key, conversations, ttl=60)

    return {"conversations": conversations, "cached": False}


@router.post("/", status_code=201)
def create_conversation(
    body: ConversationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    conversation = Conversation(user_id=user.id, title=body.title or "New chat")
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    cache.invalidate_prefix(f"conversations:{user.id}")
    return {"conversation": conversation_summary(conversation, 0)}


@router.get("/{conversation_id}")
def get_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    conversation = (
        db.query(Conversation)
        .options(joinedload(Conversation.messages))
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"conversation": conversation_detail(conversation)}


@router.patch("/{conversation_id}")
def update_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if body.title is not None:
        conversation.title = body.title
    if body.archived is not None:
        conversation.archived = body.archived

    db.commit()
    db.refresh(conversation)
    cache.invalidate_prefix(f"conversations:{user.id}")
    count = db.query(Message).filter(Message.conversation_id == conversation.id).count()
    return {"conversation": conversation_summary(conversation, count)}


@router.delete("/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conversation)
    db.commit()
    cache.invalidate_prefix(f"conversations:{user.id}")
    return Response(status_code=204)


@router.get("/{conversation_id}/export")
def export_conversation(
    conversation_id: str,
    format: str = Query(default="markdown"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = (
        db.query(Conversation)
        .options(joinedload(Conversation.messages))
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in conversation.title)[:60]

    if format == "json":
        return conversation_detail(conversation)

    lines = [f"# {conversation.title}", "", f"Exported: {conversation.updated_at.isoformat()}", ""]
    for message in conversation.messages:
        role = "You" if message.role == "user" else "Assistant"
        lines.extend([f"## {role}", "", message.content, ""])

    return PlainTextResponse(
        "\n".join(lines),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.md"'},
    )

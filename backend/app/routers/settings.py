from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.cache import cache
from app.database import get_db
from app.models import User, UserSettings
from app.schemas import SettingsUpdate
from app.serializers import settings_payload

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/")
def get_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    cache_key = f"settings:{user.id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return {"settings": cached, "cached": True}

    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    payload = settings_payload(settings, name=user.name, email=user.email)
    cache.set(cache_key, payload)
    return {"settings": payload, "cached": False}


@router.patch("/")
def update_settings(
    body: SettingsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = body.model_dump(exclude_unset=True)
    name = data.pop("name", None)

    if name:
        user.name = name

    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)

    field_map = {
        "theme": "theme",
        "model_preference": "model_preference",
        "system_prompt": "system_prompt",
        "stream_responses": "stream_responses",
        "show_timestamps": "show_timestamps",
    }
    for key, attr in field_map.items():
        if key in data:
            setattr(settings, attr, data[key])

    db.commit()
    db.refresh(user)
    db.refresh(settings)
    cache.delete(f"settings:{user.id}")
    return {"settings": settings_payload(settings, name=user.name, email=user.email)}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import User, UserSettings
from app.schemas import LoginRequest, RegisterRequest
from app.serializers import settings_payload, user_to_dict

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> dict:
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=email, password_hash=hash_password(body.password), name=body.name)
    user.settings = UserSettings()
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user_id=user.id, email=user.email)
    return {"user": user_to_dict(user), "token": token}


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user_id=user.id, email=user.email)
    return {"user": user_to_dict(user), "token": token}


@router.get("/me")
def me(user: User = Depends(get_current_user)) -> dict:
    return {
        "user": {
            **user_to_dict(user),
            "settings": settings_payload(user.settings, name=user.name, email=user.email)
            if user.settings
            else None,
        }
    }

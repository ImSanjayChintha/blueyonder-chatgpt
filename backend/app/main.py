from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.cache import cache
from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, chat, conversations, settings as settings_router

settings = get_settings()
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
(STATIC_DIR / "generated").mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="BlueYonder ChatGPT API",
    description="RESTful API for a ChatGPT-style conversational UI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(settings_router.router)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "cache": cache.backend(),
        "openai": bool(settings.openai_api_key.strip()),
        "imageGeneration": True,
        "imageModel": settings.openai_image_model if settings.openai_api_key.strip() else "pollinations",
    }

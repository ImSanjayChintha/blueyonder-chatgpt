from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    port: int = 8000
    frontend_url: str = "http://localhost:5173"
    database_url: str = "sqlite:///./chatgpt_clone.db"
    jwt_secret: str = "dev-secret"
    jwt_expires_minutes: int = 60 * 24 * 7
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_image_model: str = "gpt-image-1.5"
    redis_url: str = "redis://localhost:6379"
    cache_ttl_seconds: int = 300


@lru_cache
def get_settings() -> Settings:
    return Settings()

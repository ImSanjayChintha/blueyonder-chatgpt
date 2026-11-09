import json
import time
from typing import Any

from app.config import get_settings


class CacheService:
    """Redis primary cache with in-memory fallback."""

    def __init__(self) -> None:
        settings = get_settings()
        self.ttl_seconds = settings.cache_ttl_seconds
        self._memory: dict[str, tuple[str, float]] = {}
        self._redis = None
        self._connected = False

        try:
            import redis

            client = redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=0.5)
            client.ping()
            self._redis = client
            self._connected = True
            print("[cache] Redis connected")
        except Exception:
            print("[cache] Redis unavailable — using in-memory cache")
            self._redis = None
            self._connected = False

    def backend(self) -> str:
        return "redis" if self._redis and self._connected else "memory"

    def get(self, key: str) -> Any | None:
        if self._redis and self._connected:
            try:
                raw = self._redis.get(key)
                return json.loads(raw) if raw else None
            except Exception:
                self._connected = False

        entry = self._memory.get(key)
        if not entry:
            return None
        value, expires_at = entry
        if time.time() > expires_at:
            self._memory.pop(key, None)
            return None
        return json.loads(value)

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        ttl = ttl if ttl is not None else self.ttl_seconds
        serialized = json.dumps(value, default=str)
        if self._redis and self._connected:
            try:
                self._redis.setex(key, ttl, serialized)
                return
            except Exception:
                self._connected = False
        self._memory[key] = (serialized, time.time() + ttl)

    def delete(self, key: str) -> None:
        self._memory.pop(key, None)
        if self._redis and self._connected:
            try:
                self._redis.delete(key)
            except Exception:
                self._connected = False

    def invalidate_prefix(self, prefix: str) -> None:
        for key in list(self._memory.keys()):
            if key.startswith(prefix):
                self._memory.pop(key, None)
        if self._redis and self._connected:
            try:
                keys = self._redis.keys(f"{prefix}*")
                if keys:
                    self._redis.delete(*keys)
            except Exception:
                self._connected = False


cache = CacheService()

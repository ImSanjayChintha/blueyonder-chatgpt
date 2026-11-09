from datetime import datetime
from typing import Any, Literal

from pydantic import (
    AliasGenerator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    model_validator,
)
from pydantic.alias_generators import to_camel



class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=AliasGenerator(validation_alias=to_camel, serialization_alias=to_camel),
    )


class UserOut(CamelModel):
    id: str
    email: EmailStr
    name: str
    created_at: datetime


class UserWithSettings(UserOut):
    settings: "SettingsOut | None" = None


class RegisterRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=100)


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=1)


class AuthResponse(CamelModel):
    user: UserOut
    token: str


class SettingsOut(CamelModel):
    id: str | None = None
    theme: str = "system"
    model_preference: str = "gpt-4o-mini"
    system_prompt: str = "You are a helpful assistant."
    stream_responses: bool = True
    show_timestamps: bool = True
    name: str | None = None
    email: EmailStr | None = None


class SettingsUpdate(CamelModel):
    theme: Literal["light", "dark", "system"] | None = None
    model_preference: str | None = Field(default=None, min_length=1, max_length=64)
    system_prompt: str | None = Field(default=None, max_length=4000)
    stream_responses: bool | None = None
    show_timestamps: bool | None = None
    name: str | None = Field(default=None, min_length=1, max_length=100)


class MessageOut(CamelModel):
    id: str
    conversation_id: str
    role: str
    content: str
    content_type: str
    metadata: Any | None = None
    created_at: datetime


class ConversationSummary(CamelModel):
    id: str
    title: str
    archived: bool
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class ConversationOut(CamelModel):
    id: str
    title: str
    archived: bool
    created_at: datetime
    updated_at: datetime
    messages: list[MessageOut] = []


class ConversationCreate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)


class ConversationUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    archived: bool | None = None


class ChatSendRequest(CamelModel):
    conversation_id: str | None = None
    content: str = Field(default="", max_length=16000)
    action_id: str | None = None

    @model_validator(mode="after")
    def require_content_or_action(self) -> "ChatSendRequest":
        if not self.action_id and not self.content.strip():
            raise ValueError("content or actionId is required")
        return self



class HealthResponse(CamelModel):
    ok: bool
    cache: str
    openai: bool


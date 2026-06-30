from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class TelegramUser(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    is_bot: bool | None = None
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    language_code: str | None = None


class TelegramChat(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    type: str | None = None
    title: str | None = None
    username: str | None = None


class TelegramMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message_id: int
    from_user: TelegramUser | None = Field(default=None, alias="from")
    chat: TelegramChat
    date: int | None = None
    text: str | None = None


class TelegramUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    update_id: int
    message: TelegramMessage | None = None
    edited_message: TelegramMessage | None = None

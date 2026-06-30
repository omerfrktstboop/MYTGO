from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.schemas.telegram import TelegramUpdate
from app.services.telegram_bot import allowed_chat_ids, allowed_user_ids, process_update

router = APIRouter(prefix="/integrations/telegram", tags=["telegram"])


@router.get("/health")
async def telegram_health() -> dict[str, object]:
    return {
        "configured": bool(settings.telegram_bot_token),
        "environment": settings.environment,
        "public_access": True,
        "password_gate": True,
        "allowed_chat_ids": sorted(allowed_chat_ids()),
        "allowed_user_ids": sorted(allowed_user_ids()),
    }


@router.post("/webhook")
async def telegram_webhook(
    update: TelegramUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    secret_token: Annotated[str | None, Header(alias="X-Telegram-Bot-Api-Secret-Token")] = None,
) -> dict[str, object]:
    if settings.telegram_webhook_secret_token and secret_token != settings.telegram_webhook_secret_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Telegram webhook secret token",
        )

    return await process_update(db, update)

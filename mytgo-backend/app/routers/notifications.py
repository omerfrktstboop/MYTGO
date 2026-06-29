from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationRead, NotificationUnreadCount
from app.services.notifications import (
    get_unread_notification_count,
    list_notifications_for_user,
    mark_notification_read,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationRead])
async def get_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Notification]:
    return await list_notifications_for_user(db, current_user)


@router.get("/unread-count", response_model=NotificationUnreadCount)
async def get_notifications_unread_count(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> NotificationUnreadCount:
    return NotificationUnreadCount(
        unread_count=await get_unread_notification_count(db, current_user)
    )


@router.patch("/{notification_id}/read", response_model=NotificationRead)
async def patch_notification_read(
    notification_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Notification:
    return await mark_notification_read(db, current_user, notification_id)

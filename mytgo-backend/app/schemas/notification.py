from datetime import datetime

from app.schemas.base import ORMModel


class NotificationRead(ORMModel):
    id: int
    user_id: int
    event_type: str
    title: str
    body: str
    entity_type: str | None = None
    entity_id: int | None = None
    read_at: datetime | None = None
    created_at: datetime


class NotificationUnreadCount(ORMModel):
    unread_count: int

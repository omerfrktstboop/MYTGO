from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint(
            "appointment_id",
            "customer_id",
            "mechanic_id",
            name="uq_conversation_participants_appointment",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    mechanic_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)


class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id"),
        index=True,
        nullable=False,
    )
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

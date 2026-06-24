from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.enums import ValetStatus


class ValetTransfer(Base, TimestampMixin):
    __tablename__ = "valet_transfers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id"),
        index=True,
    )
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    valet_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    pickup_address: Mapped[str] = mapped_column(String(255), nullable=False)
    dropoff_address: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ValetStatus] = mapped_column(
        SAEnum(ValetStatus, name="valet_status"),
        default=ValetStatus.REQUESTED,
        nullable=False,
    )
    current_latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    current_longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    last_location_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

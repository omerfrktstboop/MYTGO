from __future__ import annotations

from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.enums import AppointmentStatus, ServiceType


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), index=True, nullable=False)
    mechanic_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    service_type: Mapped[ServiceType] = mapped_column(
        SAEnum(ServiceType, name="service_type"),
        nullable=False,
    )
    status: Mapped[AppointmentStatus] = mapped_column(
        SAEnum(AppointmentStatus, name="appointment_status"),
        default=AppointmentStatus.PENDING,
        nullable=False,
    )
    scheduled_at: Mapped[datetime | None]
    service_address: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    quote_amount_cents: Mapped[int | None] = mapped_column(Integer)
    quote_notes: Mapped[str | None] = mapped_column(Text)

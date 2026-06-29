from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.enums import AppointmentStatus, ExtraCostStatus, ServiceType


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
    pickup_photo_urls: Mapped[list[str] | None] = mapped_column(JSON)
    return_photo_urls: Mapped[list[str] | None] = mapped_column(JSON)
    damage_notes: Mapped[str | None] = mapped_column(Text)
    digital_approval_name: Mapped[str | None] = mapped_column(String(120))
    digital_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    extra_cost_amount_cents: Mapped[int | None] = mapped_column(Integer)
    extra_cost_notes: Mapped[str | None] = mapped_column(Text)
    extra_cost_status: Mapped[ExtraCostStatus | None] = mapped_column(
        SAEnum(ExtraCostStatus, name="extra_cost_status"),
    )
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    priority_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    premium_plan_code: Mapped[str | None] = mapped_column(String(40))

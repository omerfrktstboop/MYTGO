from __future__ import annotations

from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import ServiceHistoryOperationType


class VehicleServiceHistoryEntry(Base, TimestampMixin):
    __tablename__ = "vehicle_service_history_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), index=True, nullable=False)
    service_date: Mapped[datetime] = mapped_column(nullable=False, index=True)
    operation_type: Mapped[ServiceHistoryOperationType] = mapped_column(
        SAEnum(ServiceHistoryOperationType, name="service_history_operation_type"),
        nullable=False,
    )
    odometer_km: Mapped[int | None] = mapped_column(Integer)
    service_provider: Mapped[str | None] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text)
    cost_amount_cents: Mapped[int | None] = mapped_column(Integer)
    cost_currency: Mapped[str | None] = mapped_column(String(3))
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)

    vehicle: Mapped["Vehicle"] = relationship()

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.premium import FleetAccount
    from app.models.user import User


class Vehicle(Base, TimestampMixin):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    plate_number: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)
    brand: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    year: Mapped[int | None] = mapped_column(Integer)
    fleet_account_id: Mapped[int | None] = mapped_column(ForeignKey("fleet_accounts.id"), index=True)

    owner: Mapped["User"] = relationship(back_populates="vehicles")
    fleet_account: Mapped[FleetAccount | None] = relationship(back_populates="vehicles")

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.vehicle import Vehicle


class PremiumSubscription(Base, TimestampMixin):
    __tablename__ = "premium_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    plan_code: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    billing_cycle: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True, nullable=False)
    monthly_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    yearly_price_cents: Mapped[int | None] = mapped_column(Integer)
    priority_score: Mapped[int] = mapped_column(Integer, default=100, nullable=False)


    customer: Mapped["User"] = relationship(back_populates="premium_subscriptions")


class FleetAccount(Base, TimestampMixin):
    __tablename__ = "fleet_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_name: Mapped[str] = mapped_column(String(180), nullable=False)
    manager_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    monthly_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    included_services: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True, nullable=False)

    manager: Mapped["User"] = relationship(back_populates="managed_fleet_accounts")
    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="fleet_account", cascade="all")

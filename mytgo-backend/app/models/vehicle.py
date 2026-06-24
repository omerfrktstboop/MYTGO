from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Vehicle(Base, TimestampMixin):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    plate_number: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)
    brand: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    year: Mapped[int | None]

    owner: Mapped["User"] = relationship(back_populates="vehicles")

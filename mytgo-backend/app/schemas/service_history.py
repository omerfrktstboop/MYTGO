from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import Field, field_serializer, field_validator, model_validator

from app.models.enums import ServiceHistoryOperationType
from app.schemas.base import ORMModel
from app.schemas.vehicle import VehicleRead


class ServiceHistoryEntryBase(ORMModel):
    service_date: datetime
    operation_type: ServiceHistoryOperationType
    odometer_km: int | None = Field(default=None, ge=0)
    service_provider: str | None = Field(default=None, max_length=160)
    description: str | None = None
    cost_amount_cents: int | None = Field(default=None, ge=0)
    cost_currency: str | None = Field(default="TRY", min_length=3, max_length=3)

    @field_validator("service_provider", "description", mode="before")
    @classmethod
    def empty_string_to_none(cls, value: Any) -> Any:
        if isinstance(value, str) and value.strip() == "":
            return None
        return value

    @field_validator("cost_currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.upper()

    @model_validator(mode="after")
    def default_currency_when_cost_exists(self):
        if self.cost_amount_cents is not None and self.cost_currency is None:
            self.cost_currency = "TRY"
        return self


class ServiceHistoryEntryCreate(ServiceHistoryEntryBase):
    pass


class ServiceHistoryEntryRead(ServiceHistoryEntryBase):
    id: int
    vehicle_id: int
    created_by_id: int
    updated_by_id: int | None = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("service_date", "created_at", "updated_at")
    def serialize_datetime(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)
        return value.isoformat().replace("+00:00", "Z")


class ServiceHistoryListResponse(ORMModel):
    vehicle: VehicleRead
    items: list[ServiceHistoryEntryRead]
    total: int
    limit: int
    offset: int

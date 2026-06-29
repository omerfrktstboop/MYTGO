from datetime import datetime

from pydantic import Field

from app.models.enums import AppointmentStatus, ExtraCostStatus, ServiceType
from app.schemas.base import ORMModel


class AppointmentCreate(ORMModel):
    vehicle_id: int
    service_type: ServiceType
    scheduled_at: datetime | None = None
    service_address: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    quote_amount_cents: int | None = Field(default=None, ge=0)
    quote_notes: str | None = None
    pickup_photo_urls: list[str] | None = None
    return_photo_urls: list[str] | None = None
    damage_notes: str | None = None


class AppointmentUpdate(ORMModel):
    status: AppointmentStatus | None = None
    mechanic_id: int | None = None
    scheduled_at: datetime | None = None
    service_address: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    quote_amount_cents: int | None = Field(default=None, ge=0)
    quote_notes: str | None = None
    pickup_photo_urls: list[str] | None = None
    return_photo_urls: list[str] | None = None
    damage_notes: str | None = None
    digital_approval_name: str | None = Field(default=None, max_length=120)
    extra_cost_amount_cents: int | None = Field(default=None, ge=0)
    extra_cost_notes: str | None = None
    extra_cost_status: ExtraCostStatus | None = None


class AppointmentRead(ORMModel):
    id: int
    customer_id: int
    vehicle_id: int
    mechanic_id: int | None = None
    service_type: ServiceType
    status: AppointmentStatus
    scheduled_at: datetime | None = None
    service_address: str | None = None
    notes: str | None = None
    quote_amount_cents: int | None = None
    quote_notes: str | None = None
    pickup_photo_urls: list[str] | None = None
    return_photo_urls: list[str] | None = None
    damage_notes: str | None = None
    digital_approval_name: str | None = None
    digital_approved_at: datetime | None = None
    extra_cost_amount_cents: int | None = None
    extra_cost_notes: str | None = None
    extra_cost_status: ExtraCostStatus | None = None
    is_premium: bool = False
    priority_score: int = 0
    premium_plan_code: str | None = None

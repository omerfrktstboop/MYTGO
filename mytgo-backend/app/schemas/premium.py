from __future__ import annotations

from pydantic import Field

from app.schemas.base import ORMModel


class PremiumPlanRead(ORMModel):
    code: str
    name: str
    monthly_price_cents: int
    yearly_price_cents: int | None = None
    benefits: list[str] = Field(default_factory=list)
    priority_score: int


class PremiumSubscriptionCreate(ORMModel):
    plan_code: str
    billing_cycle: str = Field(pattern="^(monthly|yearly)$")


class PremiumSubscriptionRead(ORMModel):
    id: int
    customer_id: int
    plan_code: str
    billing_cycle: str
    status: str
    monthly_price_cents: int
    yearly_price_cents: int | None = None
    priority_score: int


class FleetAccountCreate(ORMModel):
    company_name: str = Field(min_length=2, max_length=160)
    manager_user_id: int
    vehicle_ids: list[int] = Field(default_factory=list)
    monthly_price_cents: int = Field(ge=0)
    included_services: int = Field(ge=0)


class FleetAccountRead(ORMModel):
    id: int
    company_name: str
    manager_user_id: int
    monthly_price_cents: int
    included_services: int
    status: str
    vehicle_count: int


class FleetAccountSummaryRead(ORMModel):
    id: int
    company_name: str
    manager_user_id: int
    monthly_price_cents: int
    included_services: int
    status: str
    vehicle_count: int


class PremiumFleetSummaryRead(ORMModel):
    fleet_count: int
    fleet_vehicle_count: int
    monthly_recurring_revenue_cents: int
    accounts: list[FleetAccountSummaryRead]

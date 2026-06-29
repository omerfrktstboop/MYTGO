from __future__ import annotations

from typing import TypedDict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import UserRole
from app.models.premium import FleetAccount, PremiumSubscription
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.premium import (
    FleetAccountCreate,
    FleetAccountRead,
    FleetAccountSummaryRead,
    PremiumFleetSummaryRead,
    PremiumPlanRead,
    PremiumSubscriptionCreate,
    PremiumSubscriptionRead,
)


class PremiumPlanData(TypedDict):
    code: str
    name: str
    monthly_price_cents: int
    yearly_price_cents: int | None
    benefits: list[str]
    priority_score: int


PREMIUM_PLANS: list[PremiumPlanData] = [
    {
        "code": "express",
        "name": "Express Premium",
        "monthly_price_cents": 249900,
        "yearly_price_cents": 2499000,
        "benefits": [
            "Öncelikli hızlı servis",
            "Öncelikli randevu planlama",
            "7/24 destek",
        ],
        "priority_score": 100,
    },
    {
        "code": "business",
        "name": "Business Premium",
        "monthly_price_cents": 149900,
        "yearly_price_cents": 1499000,
        "benefits": [
            "Planlı bakım desteği",
            "Takım bazlı servis görünürlüğü",
            "Standart öncelik artırımı",
        ],
        "priority_score": 60,
    },
    {
        "code": "enterprise",
        "name": "Enterprise Fleet",
        "monthly_price_cents": 1299900,
        "yearly_price_cents": 12999000,
        "benefits": [
            "Filo yönetim paneli",
            "Toplu araç takibi",
            "Özel hesap yöneticisi",
        ],
        "priority_score": 80,
    },
]

PREMIUM_PLAN_MAP: dict[str, PremiumPlanData] = {plan["code"]: plan for plan in PREMIUM_PLANS}


def list_premium_plans() -> list[PremiumPlanRead]:
    return [PremiumPlanRead.model_validate(plan) for plan in PREMIUM_PLANS]


async def get_active_premium_subscription(db: AsyncSession, customer_id: int) -> PremiumSubscription | None:
    result = await db.execute(
        select(PremiumSubscription)
        .where(
            PremiumSubscription.customer_id == customer_id,
            PremiumSubscription.status == "active",
        )
        .order_by(PremiumSubscription.created_at.desc(), PremiumSubscription.id.desc())
    )
    return result.scalars().first()


async def create_premium_subscription(
    db: AsyncSession,
    customer: User,
    payload: PremiumSubscriptionCreate,
) -> PremiumSubscriptionRead:
    plan = PREMIUM_PLAN_MAP.get(payload.plan_code)
    if plan is None:
        raise ValueError("Unknown premium plan")

    subscription = PremiumSubscription(
        customer_id=customer.id,
        plan_code=plan["code"],
        billing_cycle=payload.billing_cycle,
        status="active",
        monthly_price_cents=plan["monthly_price_cents"],
        yearly_price_cents=plan["yearly_price_cents"],
        priority_score=plan["priority_score"],
    )
    db.add(subscription)
    await db.flush()
    response = PremiumSubscriptionRead(
        id=subscription.id,
        customer_id=subscription.customer_id,
        plan_code=subscription.plan_code,
        billing_cycle=subscription.billing_cycle,
        status=subscription.status,
        monthly_price_cents=subscription.monthly_price_cents,
        yearly_price_cents=subscription.yearly_price_cents,
        priority_score=subscription.priority_score,
    )
    await db.commit()
    return response


async def create_fleet_account(
    db: AsyncSession,
    current_user: User,
    payload: FleetAccountCreate,
) -> FleetAccountRead:
    manager = await db.get(User, payload.manager_user_id)
    if manager is None:
        raise ValueError("Manager user not found")
    if current_user.role != UserRole.ADMIN and manager.id != current_user.id:
        raise ValueError("Fleet manager must match the authenticated admin or selected manager")

    unique_vehicle_ids = list(dict.fromkeys(payload.vehicle_ids))
    result = await db.execute(select(Vehicle).where(Vehicle.id.in_(unique_vehicle_ids)))
    vehicles = list(result.scalars().all())
    vehicle_map = {vehicle.id: vehicle for vehicle in vehicles}
    if len(vehicle_map) != len(unique_vehicle_ids):
        missing = sorted(set(unique_vehicle_ids) - set(vehicle_map))
        raise ValueError(f"Vehicle(s) not found: {', '.join(map(str, missing))}")

    for vehicle in vehicles:
        if vehicle.owner_id != manager.id:
            raise ValueError("Vehicles must belong to the fleet manager")
        if vehicle.fleet_account_id is not None:
            raise ValueError("Vehicle already belongs to a fleet account")

    account = FleetAccount(
        company_name=payload.company_name,
        manager_user_id=payload.manager_user_id,
        monthly_price_cents=payload.monthly_price_cents,
        included_services=payload.included_services,
        status="active",
    )
    db.add(account)
    await db.flush()

    for vehicle in vehicles:
        vehicle.fleet_account_id = account.id

    response = FleetAccountRead(
        id=account.id,
        company_name=account.company_name,
        manager_user_id=account.manager_user_id,
        monthly_price_cents=account.monthly_price_cents,
        included_services=account.included_services,
        status=account.status,
        vehicle_count=len(vehicles),
    )
    await db.commit()
    return response


async def build_fleet_summary(db: AsyncSession) -> PremiumFleetSummaryRead:
    result = await db.execute(
        select(FleetAccount)
        .options(selectinload(FleetAccount.vehicles))
        .order_by(FleetAccount.created_at.desc(), FleetAccount.id.desc())
    )
    accounts = list(result.scalars().all())
    account_items = [
        FleetAccountSummaryRead(
            id=account.id,
            company_name=account.company_name,
            manager_user_id=account.manager_user_id,
            monthly_price_cents=account.monthly_price_cents,
            included_services=account.included_services,
            status=account.status,
            vehicle_count=len(account.vehicles),
        )
        for account in accounts
    ]
    monthly_revenue = sum(account.monthly_price_cents for account in accounts)
    vehicle_count = sum(len(account.vehicles) for account in accounts)
    return PremiumFleetSummaryRead(
        fleet_count=len(accounts),
        fleet_vehicle_count=vehicle_count,
        monthly_recurring_revenue_cents=monthly_revenue,
        accounts=account_items,
    )

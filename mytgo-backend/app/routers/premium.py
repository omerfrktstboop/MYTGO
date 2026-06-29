from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.premium import (
    FleetAccountCreate,
    FleetAccountRead,
    PremiumFleetSummaryRead,
    PremiumPlanRead,
    PremiumSubscriptionCreate,
    PremiumSubscriptionRead,
)
from app.services.premium import (
    build_fleet_summary,
    create_fleet_account,
    create_premium_subscription,
    list_premium_plans,
)

router = APIRouter(prefix="/premium", tags=["premium"])


@router.get("/plans", response_model=list[PremiumPlanRead])
async def get_premium_plans() -> list[PremiumPlanRead]:
    return list_premium_plans()


@router.post("/subscriptions", response_model=PremiumSubscriptionRead, status_code=status.HTTP_201_CREATED)
async def post_premium_subscription(
    payload: PremiumSubscriptionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.CUSTOMER, UserRole.ADMIN))],
) -> PremiumSubscriptionRead:
    try:
        return await create_premium_subscription(db, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/fleet-accounts", response_model=FleetAccountRead, status_code=status.HTTP_201_CREATED)
async def post_fleet_account(
    payload: FleetAccountCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> FleetAccountRead:
    try:
        return await create_fleet_account(db, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/fleet-summary", response_model=PremiumFleetSummaryRead)
async def get_fleet_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> PremiumFleetSummaryRead:
    return await build_fleet_summary(db)

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.service_history import (
    ServiceHistoryEntryCreate,
    ServiceHistoryEntryRead,
    ServiceHistoryListResponse,
)
from app.schemas.vehicle import VehicleCreate, VehicleRead
from app.services.service_history import create_service_history_entry, list_service_history_for_vehicle
from app.services.vehicles import create_vehicle, list_vehicles_for_user

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("", response_model=list[VehicleRead])
async def get_vehicles(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Vehicle]:
    return await list_vehicles_for_user(db, current_user)


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
async def post_vehicle(
    payload: VehicleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.CUSTOMER, UserRole.ADMIN))],
) -> Vehicle:
    return await create_vehicle(db, current_user, payload)


@router.get("/{vehicle_id}/service-history", response_model=ServiceHistoryListResponse)
async def get_vehicle_service_history(
    vehicle_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ServiceHistoryListResponse:
    vehicle, items, total = await list_service_history_for_vehicle(
        db,
        current_user,
        vehicle_id,
        limit=limit,
        offset=offset,
    )
    return ServiceHistoryListResponse(vehicle=vehicle, items=items, total=total, limit=limit, offset=offset)


@router.get("/{vehicle_id}/service-history/recent", response_model=ServiceHistoryListResponse)
async def get_recent_vehicle_service_history(
    vehicle_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ServiceHistoryListResponse:
    limit = 5
    vehicle, items, total = await list_service_history_for_vehicle(
        db,
        current_user,
        vehicle_id,
        limit=limit,
        offset=0,
    )
    return ServiceHistoryListResponse(vehicle=vehicle, items=items, total=total, limit=limit, offset=0)


@router.post(
    "/{vehicle_id}/service-history",
    response_model=ServiceHistoryEntryRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_vehicle_service_history(
    vehicle_id: int,
    payload: ServiceHistoryEntryCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.CUSTOMER, UserRole.MECHANIC, UserRole.ADMIN))],
) -> ServiceHistoryEntryRead:
    return await create_service_history_entry(db, current_user, vehicle_id, payload)

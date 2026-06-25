from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.service_history import VehicleServiceHistoryEntry
from app.models.user import User
from app.schemas.service_history import (
    ServiceHistoryEntryCreate,
    ServiceHistoryEntryRead,
    ServiceHistoryListResponse,
)
from app.services.service_history import (
    create_service_history_entry,
    list_service_history_for_vehicle,
)

router = APIRouter(prefix="/vehicles/{vehicle_id}/service-history", tags=["service-history"])


@router.get("", response_model=ServiceHistoryListResponse)
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
    return ServiceHistoryListResponse(
        vehicle=vehicle,
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/recent", response_model=ServiceHistoryListResponse)
async def get_recent_vehicle_service_history(
    vehicle_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ServiceHistoryListResponse:
    vehicle, items, total = await list_service_history_for_vehicle(
        db,
        current_user,
        vehicle_id,
        limit=5,
        offset=0,
    )
    return ServiceHistoryListResponse(
        vehicle=vehicle,
        items=items,
        total=total,
        limit=5,
        offset=0,
    )


@router.post("", response_model=ServiceHistoryEntryRead, status_code=status.HTTP_201_CREATED)
async def post_vehicle_service_history(
    vehicle_id: int,
    payload: ServiceHistoryEntryCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> VehicleServiceHistoryEntry:
    return await create_service_history_entry(db, current_user, vehicle_id, payload)

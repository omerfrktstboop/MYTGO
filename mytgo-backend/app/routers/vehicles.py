from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleRead
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

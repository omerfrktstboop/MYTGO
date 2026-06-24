from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentRead, AppointmentUpdate
from app.services.appointments import create_appointment, list_appointments_for_user, update_appointment

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("", response_model=list[AppointmentRead])
async def get_appointments(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Appointment]:
    return await list_appointments_for_user(db, current_user)


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
async def post_appointment(
    payload: AppointmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.CUSTOMER, UserRole.ADMIN))],
) -> Appointment:
    return await create_appointment(db, current_user, payload)


@router.patch("/{appointment_id}", response_model=AppointmentRead)
async def patch_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Appointment:
    return await update_appointment(db, current_user, appointment_id, payload)

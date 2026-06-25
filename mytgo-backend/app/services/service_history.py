from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.enums import UserRole
from app.models.service_history import VehicleServiceHistoryEntry
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.service_history import ServiceHistoryEntryCreate
from app.services.vehicles import get_owned_vehicle


async def _ensure_vehicle_service_history_access(
    db: AsyncSession,
    user: User,
    vehicle_id: int,
) -> Vehicle:
    if user.role == UserRole.VALET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Service history access denied",
        )

    vehicle = await get_owned_vehicle(db, user, vehicle_id)

    if user.role == UserRole.MECHANIC:
        assigned_appointment = await db.execute(
            select(Appointment.id).where(
                Appointment.vehicle_id == vehicle_id,
                Appointment.mechanic_id == user.id,
            )
        )
        own_entry = await db.execute(
            select(VehicleServiceHistoryEntry.id).where(
                VehicleServiceHistoryEntry.vehicle_id == vehicle_id,
                VehicleServiceHistoryEntry.created_by_id == user.id,
            )
        )
        if assigned_appointment.scalar_one_or_none() is None and own_entry.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Service history access denied",
            )

    return vehicle


async def list_service_history_for_vehicle(
    db: AsyncSession,
    user: User,
    vehicle_id: int,
    *,
    limit: int = 20,
    offset: int = 0,
) -> tuple[Vehicle, list[VehicleServiceHistoryEntry], int]:
    vehicle = await _ensure_vehicle_service_history_access(db, user, vehicle_id)

    filters = [VehicleServiceHistoryEntry.vehicle_id == vehicle_id]
    if user.role == UserRole.MECHANIC:
        filters.append(VehicleServiceHistoryEntry.created_by_id == user.id)

    total_result = await db.execute(
        select(func.count()).select_from(VehicleServiceHistoryEntry).where(*filters)
    )
    total = int(total_result.scalar_one())

    entries_result = await db.execute(
        select(VehicleServiceHistoryEntry)
        .where(*filters)
        .order_by(
            VehicleServiceHistoryEntry.service_date.desc(),
            VehicleServiceHistoryEntry.id.desc(),
        )
        .limit(limit)
        .offset(offset)
    )
    return vehicle, list(entries_result.scalars().all()), total


async def create_service_history_entry(
    db: AsyncSession,
    user: User,
    vehicle_id: int,
    payload: ServiceHistoryEntryCreate,
) -> VehicleServiceHistoryEntry:
    await _ensure_vehicle_service_history_access(db, user, vehicle_id)
    entry = VehicleServiceHistoryEntry(
        vehicle_id=vehicle_id,
        service_date=payload.service_date,
        operation_type=payload.operation_type,
        odometer_km=payload.odometer_km,
        service_provider=payload.service_provider,
        description=payload.description,
        cost_amount_cents=payload.cost_amount_cents,
        cost_currency=payload.cost_currency or "TRY",
        created_by_id=user.id,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry

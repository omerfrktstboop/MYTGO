from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import UserRole
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate


async def list_vehicles_for_user(db: AsyncSession, user: User) -> list[Vehicle]:
    query = select(Vehicle).order_by(Vehicle.created_at.desc())
    if user.role == UserRole.CUSTOMER:
        query = query.where(Vehicle.owner_id == user.id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_vehicle(db: AsyncSession, owner: User, payload: VehicleCreate) -> Vehicle:
    existing = await db.execute(
        select(Vehicle).where(Vehicle.plate_number == payload.plate_number.upper())
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle plate already exists",
        )

    vehicle = Vehicle(
        owner_id=owner.id,
        plate_number=payload.plate_number.upper(),
        brand=payload.brand,
        model=payload.model,
        year=payload.year,
    )
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


async def get_owned_vehicle(db: AsyncSession, user: User, vehicle_id: int) -> Vehicle:
    vehicle = await db.get(Vehicle, vehicle_id)
    if vehicle is None or (user.role == UserRole.CUSTOMER and vehicle.owner_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.enums import UserRole, ValetStatus
from app.models.user import User
from app.models.valet import ValetTransfer
from app.schemas.valet import ValetTransferCreate, ValetTransferUpdate
from app.services.notifications import notify_valet_created, notify_valet_status_changed
from app.services.users import get_first_valet


async def list_valet_transfers_for_user(db: AsyncSession, user: User) -> list[ValetTransfer]:
    query = select(ValetTransfer).order_by(ValetTransfer.created_at.desc())
    if user.role == UserRole.CUSTOMER:
        query = query.where(ValetTransfer.customer_id == user.id)
    elif user.role == UserRole.VALET:
        query = query.where(
            (ValetTransfer.valet_id == user.id) | (ValetTransfer.valet_id.is_(None))
        )
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_valet_transfer(
    db: AsyncSession,
    customer: User,
    payload: ValetTransferCreate,
) -> ValetTransfer:
    if payload.appointment_id is not None:
        appointment = await db.get(Appointment, payload.appointment_id)
        if appointment is None or appointment.customer_id != customer.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )

    valet = await get_first_valet(db)
    transfer = ValetTransfer(
        appointment_id=payload.appointment_id,
        customer_id=customer.id,
        valet_id=valet.id if valet else None,
        pickup_address=payload.pickup_address,
        dropoff_address=payload.dropoff_address,
        status=ValetStatus.ASSIGNED if valet else ValetStatus.REQUESTED,
    )
    db.add(transfer)
    await db.flush()
    await notify_valet_created(db, transfer)
    await db.commit()
    await db.refresh(transfer)
    return transfer


async def get_authorized_transfer(
    db: AsyncSession,
    user: User,
    transfer_id: int,
) -> ValetTransfer:
    transfer = await db.get(ValetTransfer, transfer_id)
    if transfer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Valet request not found")

    allowed = (
        user.role in (UserRole.ADMIN, UserRole.MECHANIC)
        or transfer.customer_id == user.id
        or transfer.valet_id == user.id
        or (user.role == UserRole.VALET and transfer.valet_id is None)
    )
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Valet access denied")
    return transfer


async def update_valet_transfer(
    db: AsyncSession,
    user: User,
    transfer_id: int,
    payload: ValetTransferUpdate,
) -> ValetTransfer:
    transfer = await get_authorized_transfer(db, user, transfer_id)
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customers cannot update valet operations",
        )

    old_status = transfer.status
    update_data = payload.model_dump(exclude_unset=True)
    if user.role == UserRole.VALET:
        update_data.pop("valet_id", None)
        if transfer.valet_id is None:
            transfer.valet_id = user.id

    for key, value in update_data.items():
        setattr(transfer, key, value)

    await notify_valet_status_changed(db, transfer, old_status)
    await db.commit()
    await db.refresh(transfer)
    return transfer


async def update_transfer_location(
    db: AsyncSession,
    *,
    transfer_id: int,
    latitude: Decimal,
    longitude: Decimal,
) -> ValetTransfer:
    transfer = await db.get(ValetTransfer, transfer_id)
    if transfer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Valet request not found")

    old_status = transfer.status
    transfer.current_latitude = latitude
    transfer.current_longitude = longitude
    transfer.last_location_at = datetime.now(timezone.utc)
    if transfer.status in (ValetStatus.REQUESTED, ValetStatus.ASSIGNED):
        transfer.status = ValetStatus.PICKING_UP

    await notify_valet_status_changed(db, transfer, old_status)
    await db.commit()
    await db.refresh(transfer)
    return transfer

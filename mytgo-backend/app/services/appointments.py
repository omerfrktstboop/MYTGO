from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, UserRole
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate
from app.services.chat import get_or_create_conversation
from app.services.users import get_first_mechanic
from app.services.vehicles import get_owned_vehicle


async def list_appointments_for_user(db: AsyncSession, user: User) -> list[Appointment]:
    query = select(Appointment).order_by(Appointment.created_at.desc())
    if user.role == UserRole.CUSTOMER:
        query = query.where(Appointment.customer_id == user.id)
    elif user.role == UserRole.MECHANIC:
        query = query.where(
            (Appointment.mechanic_id == user.id) | (Appointment.mechanic_id.is_(None))
        )
    elif user.role == UserRole.VALET:
        return []
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_appointment(
    db: AsyncSession,
    customer: User,
    payload: AppointmentCreate,
) -> Appointment:
    await get_owned_vehicle(db, customer, payload.vehicle_id)
    mechanic = await get_first_mechanic(db)
    appointment = Appointment(
        customer_id=customer.id,
        vehicle_id=payload.vehicle_id,
        mechanic_id=mechanic.id if mechanic else None,
        service_type=payload.service_type,
        status=AppointmentStatus.PENDING,
        scheduled_at=payload.scheduled_at,
        service_address=payload.service_address,
        notes=payload.notes,
    )
    db.add(appointment)
    await db.flush()
    if mechanic is not None:
        await get_or_create_conversation(
            db,
            appointment_id=appointment.id,
            customer_id=customer.id,
            mechanic_id=mechanic.id,
        )
    await db.commit()
    await db.refresh(appointment)
    return appointment


async def update_appointment(
    db: AsyncSession,
    user: User,
    appointment_id: int,
    payload: AppointmentUpdate,
) -> Appointment:
    appointment = await db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    allowed = (
        user.role == UserRole.ADMIN
        or appointment.customer_id == user.id
        or user.role == UserRole.MECHANIC
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Appointment access denied",
        )

    if user.role == UserRole.CUSTOMER:
        allowed_customer_statuses = {None, AppointmentStatus.CANCELLED}
        if appointment.status == AppointmentStatus.QUOTE_SENT:
            allowed_customer_statuses.add(AppointmentStatus.APPROVED)
        if payload.status not in allowed_customer_statuses:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers can only cancel or approve submitted quotes",
            )
        if payload.quote_amount_cents is not None or payload.quote_notes is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers cannot change quote details",
            )

    if user.role == UserRole.MECHANIC and appointment.mechanic_id not in (None, user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Appointment assigned to another mechanic",
        )

    update_data = payload.model_dump(exclude_unset=True)
    if user.role == UserRole.MECHANIC:
        update_data.setdefault("mechanic_id", user.id)
        if payload.quote_amount_cents is not None and payload.status is None:
            update_data["status"] = AppointmentStatus.QUOTE_SENT

    for key, value in update_data.items():
        setattr(appointment, key, value)

    if appointment.mechanic_id is not None:
        await get_or_create_conversation(
            db,
            appointment_id=appointment.id,
            customer_id=appointment.customer_id,
            mechanic_id=appointment.mechanic_id,
        )

    await db.commit()
    await db.refresh(appointment)
    return appointment

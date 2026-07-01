from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, UserRole, ValetStatus
from app.models.notification import Notification
from app.models.user import User
from app.models.valet import ValetTransfer


async def list_notifications_for_user(db: AsyncSession, user: User) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
    )
    return list(result.scalars().all())


async def get_unread_notification_count(db: AsyncSession, user: User) -> int:
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id,
            Notification.read_at.is_(None),
        )
    )
    return int(result.scalar_one())


async def mark_notification_read(db: AsyncSession, user: User, notification_id: int) -> Notification:
    notification = await db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(notification)
    return notification


async def notify_user(
    db: AsyncSession,
    *,
    user_id: int | None,
    event_type: str,
    title: str,
    body: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> None:
    if user_id is None:
        return
    db.add(
        Notification(
            user_id=user_id,
            event_type=event_type,
            title=title,
            body=body,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )


async def notify_admins(
    db: AsyncSession,
    *,
    event_type: str,
    title: str,
    body: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> None:
    result = await db.execute(
        select(User.id).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
    )
    for admin_id in result.scalars().all():
        await notify_user(
            db,
            user_id=admin_id,
            event_type=event_type,
            title=title,
            body=body,
            entity_type=entity_type,
            entity_id=entity_id,
        )


async def notify_appointment_created(db: AsyncSession, appointment: Appointment) -> None:
    title = "Yeni servis randevusu"
    body = f"#{appointment.id} numaralı {appointment.service_type.value} talebi oluşturuldu."
    await notify_user(
        db,
        user_id=appointment.mechanic_id,
        event_type="appointment.created",
        title=title,
        body=body,
        entity_type="appointment",
        entity_id=appointment.id,
    )
    await notify_admins(
        db,
        event_type="appointment.created",
        title=title,
        body=body,
        entity_type="appointment",
        entity_id=appointment.id,
    )


async def notify_appointment_status_changed(
    db: AsyncSession,
    appointment: Appointment,
    old_status: AppointmentStatus,
) -> None:
    if appointment.status == old_status:
        return

    label = appointment.status.value.replace("_", " ")
    title = "Randevu durumu güncellendi"
    body = f"#{appointment.id} numaralı randevu durumu {label} olarak güncellendi."
    recipients = {appointment.customer_id}
    if appointment.mechanic_id is not None:
        recipients.add(appointment.mechanic_id)
    for user_id in recipients:
        await notify_user(
            db,
            user_id=user_id,
            event_type="appointment.status_changed",
            title=title,
            body=body,
            entity_type="appointment",
            entity_id=appointment.id,
        )
    await notify_admins(
        db,
        event_type="appointment.status_changed",
        title=title,
        body=body,
        entity_type="appointment",
        entity_id=appointment.id,
    )


async def notify_appointment_quote_sent(db: AsyncSession, appointment: Appointment) -> None:
    if appointment.status != AppointmentStatus.QUOTE_SENT:
        return
    await notify_user(
        db,
        user_id=appointment.customer_id,
        event_type="appointment.quote_sent",
        title="Servis teklifi hazır",
        body=f"#{appointment.id} numaralı randevu için usta fiyat teklifi gönderdi.",
        entity_type="appointment",
        entity_id=appointment.id,
    )


async def notify_valet_created(db: AsyncSession, transfer: ValetTransfer) -> None:
    title = "Yeni vale talebi"
    body = f"#{transfer.id} numaralı vale talebi oluşturuldu."
    await notify_user(
        db,
        user_id=transfer.valet_id,
        event_type="valet.created",
        title=title,
        body=body,
        entity_type="valet_transfer",
        entity_id=transfer.id,
    )
    await notify_admins(
        db,
        event_type="valet.created",
        title=title,
        body=body,
        entity_type="valet_transfer",
        entity_id=transfer.id,
    )


async def notify_valet_status_changed(
    db: AsyncSession,
    transfer: ValetTransfer,
    old_status: ValetStatus,
) -> None:
    if transfer.status == old_status:
        return
    label = transfer.status.value.replace("_", " ")
    title = "Vale durumu güncellendi"
    body = f"#{transfer.id} numaralı vale talebi {label} durumuna geçti."
    recipients = {transfer.customer_id}
    if transfer.valet_id is not None:
        recipients.add(transfer.valet_id)
    for user_id in recipients:
        await notify_user(
            db,
            user_id=user_id,
            event_type="valet.status_changed",
            title=title,
            body=body,
            entity_type="valet_transfer",
            entity_id=transfer.id,
        )
    await notify_admins(
        db,
        event_type="valet.status_changed",
        title=title,
        body=body,
        entity_type="valet_transfer",
        entity_id=transfer.id,
    )

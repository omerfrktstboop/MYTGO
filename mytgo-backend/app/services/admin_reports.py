from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, UserRole, ValetStatus
from app.models.user import User
from app.models.valet import ValetTransfer

DEFAULT_TIMEZONE = "Europe/Istanbul"

APPOINTMENT_STATUS_META = {
    AppointmentStatus.PENDING: ("Bekliyor", "open"),
    AppointmentStatus.QUOTE_SENT: ("Teklif Gönderildi", "open"),
    AppointmentStatus.APPROVED: ("Onaylandı", "active"),
    AppointmentStatus.IN_PROGRESS: ("İşlemde", "active"),
    AppointmentStatus.COMPLETED: ("Tamamlandı", "completed"),
    AppointmentStatus.CANCELLED: ("İptal", "cancelled"),
}

VALET_STATUS_META = {
    ValetStatus.REQUESTED: ("Talep", "open"),
    ValetStatus.ASSIGNED: ("Atandı", "active"),
    ValetStatus.PICKING_UP: ("Alıma Gidiyor", "active"),
    ValetStatus.IN_TRANSIT_TO_SERVICE: ("Servise Gidiyor", "active"),
    ValetStatus.AT_SERVICE: ("Serviste", "active"),
    ValetStatus.RETURNING: ("Dönüşte", "active"),
    ValetStatus.DELIVERED: ("Teslim", "completed"),
    ValetStatus.CANCELLED: ("İptal", "cancelled"),
}

USER_ROLE_LABELS = {
    UserRole.CUSTOMER: "Müşteri",
    UserRole.MECHANIC: "Usta",
    UserRole.VALET: "Vale",
    UserRole.ADMIN: "Admin",
}

ACTIVE_APPOINTMENT_STATUSES = (
    AppointmentStatus.PENDING,
    AppointmentStatus.QUOTE_SENT,
    AppointmentStatus.APPROVED,
    AppointmentStatus.IN_PROGRESS,
)
ACTIVE_VALET_STATUSES = (
    ValetStatus.REQUESTED,
    ValetStatus.ASSIGNED,
    ValetStatus.PICKING_UP,
    ValetStatus.IN_TRANSIT_TO_SERVICE,
    ValetStatus.AT_SERVICE,
    ValetStatus.RETURNING,
)
APPROVED_REVENUE_STATUSES = (
    AppointmentStatus.APPROVED,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
)


@dataclass(frozen=True)
class ReportRange:
    start: datetime
    end: datetime
    timezone: ZoneInfo


def _parse_datetime_param(value: str | None, timezone: ZoneInfo, *, is_end: bool) -> datetime | None:
    if value is None:
        return None
    try:
        parsed_date = date.fromisoformat(value)
    except ValueError:
        parsed_date = None
    if parsed_date is not None:
        return datetime.combine(parsed_date, time.min, tzinfo=timezone)

    try:
        parsed_datetime = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid report range",
        ) from None
    if parsed_datetime.tzinfo is None:
        return parsed_datetime.replace(tzinfo=timezone)
    return parsed_datetime.astimezone(timezone)


def resolve_report_range(
    from_value: str | None,
    to_value: str | None,
    timezone_name: str,
) -> ReportRange:
    try:
        timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid report range",
        ) from None

    now = datetime.now(timezone)
    start = _parse_datetime_param(from_value, timezone, is_end=False) or now.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    end = _parse_datetime_param(to_value, timezone, is_end=True) or now
    if start >= end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid report range",
        )
    return ReportRange(start=start, end=end, timezone=timezone)


def _to_db_datetime(value: datetime) -> datetime:
    return value.astimezone(UTC).replace(tzinfo=None)


def _iso_seconds(value: datetime) -> str:
    return value.replace(microsecond=0).isoformat()


def _round_percentage(count: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round(count / total * 100, 1)


def _format_try(cents: int) -> str:
    liras = round(cents / 100)
    return "₺" + f"{liras:,}".replace(",", ".")


async def _count(db: AsyncSession, statement) -> int:
    result = await db.execute(statement)
    return int(result.scalar_one() or 0)


async def _sum_cents(db: AsyncSession, statement) -> int:
    result = await db.execute(statement)
    return int(result.scalar_one() or 0)


def _appointment_range_filter(report_range: ReportRange):
    return (
        Appointment.created_at >= _to_db_datetime(report_range.start),
        Appointment.created_at < _to_db_datetime(report_range.end),
    )


def _valet_range_filter(report_range: ReportRange):
    return (
        ValetTransfer.created_at >= _to_db_datetime(report_range.start),
        ValetTransfer.created_at < _to_db_datetime(report_range.end),
    )


def _distribution_payload(status_meta, counts: dict, total: int, include_zero_statuses: bool) -> list[dict]:
    if not include_zero_statuses and total == 0:
        return []
    rows = []
    for status_value, (label, group) in status_meta.items():
        count = int(counts.get(status_value, 0))
        if not include_zero_statuses and count == 0:
            continue
        rows.append(
            {
                "status": status_value.value,
                "label": label,
                "group": group,
                "count": count,
                "percentage": _round_percentage(count, total),
            }
        )
    return rows


async def build_admin_report_overview(
    db: AsyncSession,
    *,
    from_value: str | None = None,
    to_value: str | None = None,
    timezone_name: str = DEFAULT_TIMEZONE,
    include_zero_statuses: bool = True,
) -> dict:
    report_range = resolve_report_range(from_value, to_value, timezone_name)
    appointment_filters = _appointment_range_filter(report_range)
    valet_filters = _valet_range_filter(report_range)

    appointment_count_rows = await db.execute(
        select(Appointment.status, func.count(Appointment.id))
        .where(*appointment_filters)
        .group_by(Appointment.status)
    )
    appointment_counts = {status_key: int(count) for status_key, count in appointment_count_rows.all()}
    total_appointments = sum(appointment_counts.values())

    valet_count_rows = await db.execute(
        select(ValetTransfer.status, func.count(ValetTransfer.id))
        .where(*valet_filters)
        .group_by(ValetTransfer.status)
    )
    valet_counts = {status_key: int(count) for status_key, count in valet_count_rows.all()}
    total_valet_requests = sum(valet_counts.values())

    completed_appointments = appointment_counts.get(AppointmentStatus.COMPLETED, 0)
    completed_valet = valet_counts.get(ValetStatus.DELIVERED, 0)

    approved_amount = await _sum_cents(
        db,
        select(func.coalesce(func.sum(Appointment.quote_amount_cents), 0)).where(
            *appointment_filters,
            Appointment.quote_amount_cents.is_not(None),
            Appointment.status.in_(APPROVED_REVENUE_STATUSES),
        ),
    )
    completed_amount = await _sum_cents(
        db,
        select(func.coalesce(func.sum(Appointment.quote_amount_cents), 0)).where(
            *appointment_filters,
            Appointment.quote_amount_cents.is_not(None),
            Appointment.status == AppointmentStatus.COMPLETED,
        ),
    )
    pending_amount = await _sum_cents(
        db,
        select(func.coalesce(func.sum(Appointment.quote_amount_cents), 0)).where(
            *appointment_filters,
            Appointment.quote_amount_cents.is_not(None),
            Appointment.status == AppointmentStatus.QUOTE_SENT,
        ),
    )
    completed_with_quote = await _count(
        db,
        select(func.count(Appointment.id)).where(
            *appointment_filters,
            Appointment.quote_amount_cents.is_not(None),
            Appointment.status == AppointmentStatus.COMPLETED,
        ),
    )
    average_completed_amount = int(completed_amount / completed_with_quote) if completed_with_quote else 0

    active_appointments = await _count(
        db,
        select(func.count(Appointment.id)).where(
            *appointment_filters,
            Appointment.status.in_(ACTIVE_APPOINTMENT_STATUSES),
        ),
    )
    active_valet_transfers = await _count(
        db,
        select(func.count(ValetTransfer.id)).where(
            *valet_filters,
            ValetTransfer.status.in_(ACTIVE_VALET_STATUSES),
        ),
    )
    unassigned_appointments = await _count(
        db,
        select(func.count(Appointment.id)).where(
            *appointment_filters,
            Appointment.status.in_(ACTIVE_APPOINTMENT_STATUSES),
            Appointment.mechanic_id.is_(None),
        ),
    )
    unassigned_valet_transfers = await _count(
        db,
        select(func.count(ValetTransfer.id)).where(
            *valet_filters,
            ValetTransfer.status.in_(ACTIVE_VALET_STATUSES),
            ValetTransfer.valet_id.is_(None),
        ),
    )

    user_role_rows = await db.execute(
        select(User.role, func.count(User.id)).where(User.is_active.is_(True)).group_by(User.role)
    )
    active_users_by_role = {role: int(count) for role, count in user_role_rows.all()}

    return {
        "range": {
            "from": _iso_seconds(report_range.start),
            "to": _iso_seconds(report_range.end),
            "timezone": timezone_name,
        },
        "summary": {
            "total_appointments": total_appointments,
            "total_valet_requests": total_valet_requests,
        },
        "status_distribution": {
            "appointments": _distribution_payload(
                APPOINTMENT_STATUS_META,
                appointment_counts,
                total_appointments,
                include_zero_statuses,
            ),
            "valet_requests": _distribution_payload(
                VALET_STATUS_META,
                valet_counts,
                total_valet_requests,
                include_zero_statuses,
            ),
        },
        "completed_jobs": {
            "appointments": completed_appointments,
            "valet_deliveries": completed_valet,
            "total": completed_appointments + completed_valet,
        },
        "revenue": {
            "currency": "TRY",
            "approved_quote_amount_cents": approved_amount,
            "completed_amount_cents": completed_amount,
            "pending_quote_amount_cents": pending_amount,
            "average_completed_amount_cents": average_completed_amount,
            "formatted": {
                "approved_quote_amount": _format_try(approved_amount),
                "completed_amount": _format_try(completed_amount),
                "pending_quote_amount": _format_try(pending_amount),
                "average_completed_amount": _format_try(average_completed_amount),
            },
        },
        "operations": {
            "active_appointments": active_appointments,
            "active_valet_transfers": active_valet_transfers,
            "unassigned_appointments": unassigned_appointments,
            "unassigned_valet_transfers": unassigned_valet_transfers,
            "appointment_cancellation_rate": _round_percentage(
                appointment_counts.get(AppointmentStatus.CANCELLED, 0),
                total_appointments,
            ),
            "valet_cancellation_rate": _round_percentage(
                valet_counts.get(ValetStatus.CANCELLED, 0),
                total_valet_requests,
            ),
            "active_users_by_role": [
                {"role": role.value, "label": USER_ROLE_LABELS[role], "count": active_users_by_role.get(role, 0)}
                for role in (UserRole.CUSTOMER, UserRole.MECHANIC, UserRole.VALET, UserRole.ADMIN)
            ],
        },
        "meta": {
            "generated_at": _iso_seconds(datetime.now(report_range.timezone)),
            "data_freshness": "realtime",
            "notes": [
                "Revenue is quote-based; no payment collection table exists yet.",
                "Completed metrics use created_at until completed_at is introduced.",
            ],
        },
    }

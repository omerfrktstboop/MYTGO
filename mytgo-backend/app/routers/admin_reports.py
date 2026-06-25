from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.admin_reports import AdminReportOverview
from app.services.admin_reports import DEFAULT_TIMEZONE, build_admin_report_overview

router = APIRouter(prefix="/admin/reports", tags=["admin-reports"])


@router.get("/overview", response_model=AdminReportOverview, response_model_by_alias=True)
async def get_admin_report_overview(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    from_: Annotated[str | None, Query(alias="from")] = None,
    to: str | None = None,
    timezone: str = DEFAULT_TIMEZONE,
    include_zero_statuses: bool = True,
) -> dict:
    return await build_admin_report_overview(
        db,
        from_value=from_,
        to_value=to,
        timezone_name=timezone,
        include_zero_statuses=include_zero_statuses,
    )

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserRead
from app.services.users import list_users

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
async def get_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> list[User]:
    return await list_users(db)

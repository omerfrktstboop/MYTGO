from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.models.valet import ValetTransfer
from app.schemas.valet import ValetTransferCreate, ValetTransferRead, ValetTransferUpdate
from app.services.valet import create_valet_transfer, list_valet_transfers_for_user, update_valet_transfer

router = APIRouter(prefix="/valet-requests", tags=["valet"])


@router.get("", response_model=list[ValetTransferRead])
async def get_valet_requests(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ValetTransfer]:
    return await list_valet_transfers_for_user(db, current_user)


@router.post("", response_model=ValetTransferRead, status_code=status.HTTP_201_CREATED)
async def post_valet_request(
    payload: ValetTransferCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.CUSTOMER, UserRole.ADMIN))],
) -> ValetTransfer:
    return await create_valet_transfer(db, current_user, payload)


@router.patch("/{transfer_id}", response_model=ValetTransferRead)
async def patch_valet_request(
    transfer_id: int,
    payload: ValetTransferUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.VALET, UserRole.ADMIN))],
) -> ValetTransfer:
    return await update_valet_transfer(db, current_user, transfer_id, payload)

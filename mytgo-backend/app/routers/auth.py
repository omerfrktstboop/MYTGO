from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserRead
from app.services.users import authenticate_user, create_user, get_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    existing = await get_user_by_email(db, payload.email)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = await create_user(db, payload)
    token = create_access_token(subject=str(user.id), role=user.role)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    user = await authenticate_user(db, payload.email, payload.password)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(subject=str(user.id), role=user.role)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
async def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user

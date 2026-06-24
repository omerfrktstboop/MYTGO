from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    return await db.get(User, user_id)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_first_mechanic(db: AsyncSession) -> User | None:
    result = await db.execute(
        select(User).where(User.role == UserRole.MECHANIC, User.is_active.is_(True)).limit(1)
    )
    return result.scalar_one_or_none()


async def get_first_valet(db: AsyncSession) -> User | None:
    result = await db.execute(
        select(User).where(User.role == UserRole.VALET, User.is_active.is_(True)).limit(1)
    )
    return result.scalar_one_or_none()


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def create_user(db: AsyncSession, payload: UserCreate) -> User:
    user = User(
        email=payload.email.lower(),
        phone=payload.phone,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user

import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.user import User

DEMO_USERS = [
    ("customer@mytgo.local", "MYTGO Customer", UserRole.CUSTOMER),
    ("mechanic@mytgo.local", "MYTGO Mechanic", UserRole.MECHANIC),
    ("valet@mytgo.local", "MYTGO Valet", UserRole.VALET),
    ("admin@mytgo.local", "MYTGO Admin", UserRole.ADMIN),
]


async def seed() -> None:
    await init_db()
    async with AsyncSessionLocal() as db:
        for email, full_name, role in DEMO_USERS:
            result = await db.execute(select(User).where(User.email == email))
            if result.scalar_one_or_none() is not None:
                continue
            db.add(
                User(
                    email=email,
                    full_name=full_name,
                    phone=None,
                    hashed_password=hash_password(settings.demo_password),
                    role=role,
                    is_active=True,
                )
            )
        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed())

from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine
from app.models import appointment, chat, service_history, user, valet, vehicle  # noqa: F401


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        if engine.url.get_backend_name().startswith("sqlite"):
            result = await connection.execute(text("PRAGMA table_info(appointments)"))
            columns = {row[1] for row in result.fetchall()}
            if "quote_amount_cents" not in columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN quote_amount_cents INTEGER"))
            if "quote_notes" not in columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN quote_notes TEXT"))

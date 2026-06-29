from pathlib import Path

from sqlalchemy import text

from app.db.base import Base
from app.db.session import get_engine
from app.models import appointment, chat, notification, premium, service_history, user, valet, vehicle  # noqa: F401


async def init_db() -> None:
    engine = get_engine()
    if engine.url.get_backend_name().startswith("sqlite"):
        db_name = Path(engine.url.database or "").name
        if db_name.startswith("test_"):
            await engine.dispose()
            db_path = Path(engine.url.database or "")
            for suffix in ("", "-wal", "-shm", "-journal"):
                candidate = db_path.with_name(db_path.name + suffix)
                if candidate.exists():
                    candidate.unlink()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        if engine.url.get_backend_name().startswith("sqlite"):
            result = await connection.execute(text("PRAGMA table_info(appointments)"))
            appointment_columns = {row[1] for row in result.fetchall()}
            if "quote_amount_cents" not in appointment_columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN quote_amount_cents INTEGER"))
            if "quote_notes" not in appointment_columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN quote_notes TEXT"))
            if "pickup_photo_urls" not in appointment_columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN pickup_photo_urls JSON"))
            if "return_photo_urls" not in appointment_columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN return_photo_urls JSON"))
            if "damage_notes" not in appointment_columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN damage_notes TEXT"))
            if "digital_approval_name" not in appointment_columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN digital_approval_name VARCHAR(120)"))
            if "digital_approved_at" not in appointment_columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN digital_approved_at DATETIME"))
            if "extra_cost_amount_cents" not in appointment_columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN extra_cost_amount_cents INTEGER"))
            if "extra_cost_notes" not in appointment_columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN extra_cost_notes TEXT"))
            if "extra_cost_status" not in appointment_columns:
                await connection.execute(text("ALTER TABLE appointments ADD COLUMN extra_cost_status VARCHAR(8)"))
            result = await connection.execute(text("PRAGMA table_info(premium_subscriptions)"))
            premium_columns = {row[1] for row in result.fetchall()}
            if "yearly_price_cents" not in premium_columns:
                await connection.execute(text("ALTER TABLE premium_subscriptions ADD COLUMN yearly_price_cents INTEGER"))
            result = await connection.execute(text("PRAGMA table_info(vehicles)"))
            vehicle_columns = {row[1] for row in result.fetchall()}
            if "fleet_account_id" not in vehicle_columns:
                await connection.execute(text("ALTER TABLE vehicles ADD COLUMN fleet_account_id INTEGER"))

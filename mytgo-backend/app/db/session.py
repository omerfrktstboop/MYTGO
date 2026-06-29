import os
from collections.abc import AsyncIterator
from functools import lru_cache
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings


def _runtime_database_url() -> str:
    current_test = os.environ.get("PYTEST_CURRENT_TEST")
    if current_test:
        module_path = current_test.split("::", 1)[0]
        stem = Path(module_path).stem
        if stem.startswith("test_"):
            return f"sqlite+aiosqlite:///./{stem}.db"
    return Settings().database_url


@lru_cache(maxsize=None)
def _engine_for(database_url: str, sql_echo: bool) -> AsyncEngine:
    return create_async_engine(
        database_url,
        echo=sql_echo,
        future=True,
    )


def get_engine() -> AsyncEngine:
    settings = Settings()
    return _engine_for(_runtime_database_url(), settings.sql_echo)


@lru_cache(maxsize=None)
def _sessionmaker_for(database_url: str, sql_echo: bool) -> async_sessionmaker[AsyncSession]:
    engine = _engine_for(database_url, sql_echo)
    return async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )


def AsyncSessionLocal() -> AsyncSession:
    settings = Settings()
    return _sessionmaker_for(_runtime_database_url(), settings.sql_echo)()


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.middleware import RequestLoggingMiddleware
from app.db.init_db import init_db
from app.routers.api import api_router
from app.routers.websocket import router as websocket_router

configure_logging(settings.log_level)
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info(
        "application_started",
        app_name=settings.app_name,
        environment=settings.environment,
    )
    yield
    logger.info("application_stopped", app_name=settings.app_name)


app = FastAPI(
    title="MYTGO API",
    description="MYTGO vehicle maintenance, valet tracking, and service communication API.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestLoggingMiddleware)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "app": "MYTGO"}


app.include_router(api_router, prefix="/api/v1")
app.include_router(websocket_router)

from time import perf_counter
from uuid import uuid4

import structlog
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid4())
        started_at = perf_counter()
        response = None

        try:
            response = await call_next(request)
            return response
        finally:
            duration_ms = round((perf_counter() - started_at) * 1000, 2)
            logger.info(
                "http_request",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=getattr(response, "status_code", 500),
                duration_ms=duration_ms,
            )

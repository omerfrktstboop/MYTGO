from __future__ import annotations

import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Any

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
import app.models  # noqa: F401
from app.db.session import AsyncSessionLocal
from app.schemas.telegram import TelegramUpdate
from app.services.telegram_bot import process_update

LOG = logging.getLogger("telegram_poller")
OFFSET_FILE = Path(".runtime/telegram_update_offset.json")
POLL_TIMEOUT_SECONDS = 50
SLEEP_SECONDS = 2
ERROR_SLEEP_SECONDS = 5


def _load_offset() -> int | None:
    try:
        data = json.loads(OFFSET_FILE.read_text())
    except FileNotFoundError:
        return None
    except Exception:
        return None

    try:
        value = int(data.get("offset"))
    except Exception:
        return None
    return value if value > 0 else None


def _save_offset(offset: int) -> None:
    OFFSET_FILE.parent.mkdir(parents=True, exist_ok=True)
    OFFSET_FILE.write_text(json.dumps({"offset": offset}, ensure_ascii=False))


async def _telegram_request(
    method: str,
    payload: dict[str, Any] | None = None,
    *,
    timeout_seconds: float | None = None,
) -> dict[str, Any]:
    if not settings.telegram_bot_token:
        raise RuntimeError("MYTGO_TELEGRAM_BOT_TOKEN is not configured")

    url = f"{settings.telegram_api_base_url.rstrip('/')}/bot{settings.telegram_bot_token}/{method}"
    client_timeout = timeout_seconds if timeout_seconds is not None else settings.telegram_request_timeout_seconds
    async with httpx.AsyncClient(timeout=client_timeout) as client:
        if payload is None:
            response = await client.get(url)
        else:
            response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()


async def _delete_webhook() -> None:
    await _telegram_request("deleteWebhook", {"drop_pending_updates": True})


async def _get_updates(offset: int | None) -> list[dict[str, Any]]:
    payload: dict[str, Any] = {
        "timeout": POLL_TIMEOUT_SECONDS,
        "allowed_updates": ["message", "edited_message"],
    }
    if offset is not None:
        payload["offset"] = offset

    result = await _telegram_request("getUpdates", payload, timeout_seconds=POLL_TIMEOUT_SECONDS + 20)
    if not result.get("ok"):
        raise RuntimeError(f"Telegram getUpdates failed: {result}")
    updates = result.get("result") or []
    if not isinstance(updates, list):
        raise RuntimeError(f"Unexpected getUpdates payload: {result}")
    return updates


async def run_forever() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    LOG.info("starting telegram poller")
    await _delete_webhook()
    offset = _load_offset()
    if offset:
        LOG.info("loaded offset=%s", offset)

    while True:
        try:
            updates = await _get_updates(offset)
            if not updates:
                await asyncio.sleep(SLEEP_SECONDS)
                continue

            for update_data in updates:
                update = TelegramUpdate.model_validate(update_data)
                next_offset = update.update_id + 1
                async with AsyncSessionLocal() as db:
                    try:
                        result = await process_update(db, update)
                        LOG.info("processed update_id=%s result=%s", update.update_id, result)
                    except Exception as exc:
                        LOG.exception("failed processing update_id=%s: %s", update.update_id, exc)
                    finally:
                        offset = next_offset
                        _save_offset(offset)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            LOG.exception("polling loop error: %s", exc)
            await asyncio.sleep(ERROR_SLEEP_SECONDS)


if __name__ == "__main__":
    asyncio.run(run_forever())

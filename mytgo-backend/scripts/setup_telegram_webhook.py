from __future__ import annotations

import argparse
import asyncio
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[1]
import sys

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import settings

async def set_webhook(
    webhook_url: str,
    *,
    drop_pending_updates: bool = False,
    ip_address: str | None = None,
) -> dict[str, Any]:
    if not settings.telegram_bot_token:
        raise SystemExit("E-Cars_TELEGRAM_BOT_TOKEN is not configured")

    secret_token = settings.telegram_webhook_secret_token
    payload: dict[str, Any] = {
        "url": webhook_url,
        "drop_pending_updates": drop_pending_updates,
    }
    if secret_token:
        payload["secret_token"] = secret_token
    if ip_address:
        payload["ip_address"] = ip_address

    api_base = settings.telegram_api_base_url.rstrip("/")
    url = f"{api_base}/bot{settings.telegram_bot_token}/setWebhook"

    async with httpx.AsyncClient(timeout=settings.telegram_request_timeout_seconds) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()


async def delete_webhook() -> dict[str, Any]:
    if not settings.telegram_bot_token:
        raise SystemExit("E-Cars_TELEGRAM_BOT_TOKEN is not configured")

    api_base = settings.telegram_api_base_url.rstrip("/")
    url = f"{api_base}/bot{settings.telegram_bot_token}/deleteWebhook"

    async with httpx.AsyncClient(timeout=settings.telegram_request_timeout_seconds) as client:
        response = await client.post(url)
        response.raise_for_status()
        return response.json()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Configure Telegram webhook for E-Cars")
    subparsers = parser.add_subparsers(dest="command", required=True)

    set_parser = subparsers.add_parser("set", help="Set Telegram webhook")
    set_parser.add_argument("webhook_url", help="Public HTTPS URL for /api/v1/integrations/telegram/webhook")
    set_parser.add_argument(
        "--ip-address",
        help="Optional public IP to use when DNS does not resolve for Telegram's servers",
    )
    set_parser.add_argument(
        "--drop-pending-updates",
        action="store_true",
        help="Ask Telegram to drop queued updates while switching webhooks",
    )

    subparsers.add_parser("delete", help="Delete Telegram webhook")
    return parser


async def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "set":
        result = await set_webhook(
            args.webhook_url,
            drop_pending_updates=args.drop_pending_updates,
            ip_address=args.ip_address,
        )
    else:
        result = await delete_webhook()

    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

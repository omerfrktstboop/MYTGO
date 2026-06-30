from __future__ import annotations

import logging
import re
from collections.abc import Iterable
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.notification import Notification
from app.models.telegram_auth import TelegramAuthGrant
from app.models.user import User
from app.schemas.telegram import TelegramMessage, TelegramUpdate
from app.services.coding_operator import build_coding_ack, infer_coding_request, run_coding_request
from app.services.notifications import get_unread_notification_count, list_notifications_for_user
from app.services.telegram_ai import generate_ai_reply

HELP_TEXT = (
    "Merhaba! Ben MYTGO asistanıyım.\n"
    "Normal sorulara cevap veririm, ama eylem tarafında sadece MYTGO için kod yazar ve deploy ederim.\n"
    "• Kod değişikliği: 'şu hatayı düzelt', 'yeni buton ekle'\n"
    "• Test çalıştırma: 'testleri koş', 'pytest çalıştır'\n"
    "• GitHub işlemleri: 'GitHub'a pushla', 'değişiklikleri gönder'\n"
    "• Deploy: 'canlıya al', 'deploy et'\n"
    "\n"
    "Ama 'uygulamayı durdur', 'sunucuyu restart et' gibi operasyonel işleri yapmam."
)

START_TEXT = (
    "Selam! 👋\n"
    "Ben MYTGO asistanıyım.\n"
    "Sorularını cevaplarım; eylem tarafında ise sadece MYTGO kodunu değiştirir, test eder ve deploy ederim.\n"
    "Sunucu durdurma/restart gibi operasyonel işlemleri yapmam."
)

AUTH_PROMPT_TEXT = (
    "Hoş geldin! Önce şifreyi girmen lazım ki kod değişiklikleri yapabileyim. "
    "Şifreyi yaz ve devam edelim."
)

AUTH_SUCCESS_TEXT = "Harika! Şifre doğru. Artık kod değişiklikleri yapabilirsin. Ne yapalım?"
AUTH_FAILURE_TEXT = "Şifre yanlış oldu. Tekrar dener misin?"

MAX_NOTIFICATIONS_PER_REPLY = 5

_BLOCKED_OPERATION_VERBS = (
    "restart",
    "yeniden başlat",
    "yeniden baslat",
    "durdur",
    "stop",
    "kapat",
    "kill",
)

_BLOCKED_OPERATION_TARGETS = (
    "uygulama",
    "app",
    "sunucu",
    "server",
    "servis",
    "service",
    "backend",
    "frontend",
    "worker",
    "poller",
    "nginx",
    "database",
    "db",
)

logger = logging.getLogger(__name__)


def parse_id_list(raw_value: str | None) -> set[int]:
    if not raw_value:
        return set()

    values: set[int] = set()
    for chunk in re.split(r"[\s,]+", raw_value.strip()):
        if not chunk:
            continue
        values.add(int(chunk))
    return values


def parse_user_map(raw_value: str | None) -> dict[int, int]:
    if not raw_value:
        return {}

    mapping: dict[int, int] = {}
    for chunk in re.split(r"[\s,]+", raw_value.strip()):
        if not chunk:
            continue
        telegram_id_text, app_user_id_text = re.split(r"[:=]", chunk, maxsplit=1)
        mapping[int(telegram_id_text)] = int(app_user_id_text)
    return mapping


def allowed_chat_ids() -> set[int]:
    return parse_id_list(settings.telegram_allowed_chat_ids)


def allowed_user_ids() -> set[int]:
    return parse_id_list(settings.telegram_allowed_user_ids)


def telegram_user_map() -> dict[int, int]:
    return parse_user_map(settings.telegram_user_map)


def is_allowed_update(update: TelegramUpdate) -> bool:
    message = update.message or update.edited_message
    if message is None:
        return False

    allowed_chats = allowed_chat_ids()
    allowed_users = allowed_user_ids()

    if not allowed_chats and not allowed_users:
        return True

    chat_allowed = message.chat.id in allowed_chats if allowed_chats else False
    user_allowed = message.from_user.id in allowed_users if message.from_user and allowed_users else False
    return chat_allowed or user_allowed


async def get_telegram_auth_grant(db: AsyncSession, message: TelegramMessage) -> TelegramAuthGrant | None:
    if message.from_user is None:
        return None

    result = await db.execute(
        select(TelegramAuthGrant).where(TelegramAuthGrant.telegram_user_id == message.from_user.id)
    )
    return result.scalar_one_or_none()


async def ensure_telegram_access(db: AsyncSession, message: TelegramMessage) -> str | None:
    if message.from_user is None:
        return AUTH_PROMPT_TEXT

    existing_grant = await get_telegram_auth_grant(db, message)
    now = datetime.now(timezone.utc)

    if existing_grant is not None:
        existing_grant.last_seen_at = now
        await db.commit()
        return None

    if message.text is None:
        return AUTH_PROMPT_TEXT

    if message.text.strip() != settings.telegram_access_password:
        return AUTH_PROMPT_TEXT

    db.add(
        TelegramAuthGrant(
            telegram_user_id=message.from_user.id,
            display_name=message.from_user.first_name or message.from_user.username or f"user-{message.from_user.id}",
            last_seen_at=now,
        )
    )

    await db.commit()
    return AUTH_SUCCESS_TEXT


def normalize_command(text: str) -> tuple[str, str]:
    stripped = text.strip()
    if not stripped.startswith("/"):
        return "", stripped

    head, *tail = stripped.split(maxsplit=1)
    command = head[1:].split("@", maxsplit=1)[0].lower()
    argument = tail[0].strip() if tail else ""

    if command == "mytgo":
        if not argument:
            return "help", ""
        nested_head, *nested_tail = argument.split(maxsplit=1)
        command = nested_head.lower()
        argument = nested_tail[0].strip() if nested_tail else ""

    return command, argument


def infer_natural_language_intent(text: str) -> tuple[str, str]:
    normalized = re.sub(r"\s+", " ", text.strip().lower())
    if not normalized:
        return "", ""

    if any(token in normalized for token in ("yardım", "yardim", "ne yapabilirsin", "komut", "help")):
        return "help", ""
    if any(token in normalized for token in ("durum", "çalışıyor", "calisiyor", "health", "status")):
        return "health", ""
    if any(token in normalized for token in ("ben kimim", "kimim", "profil", "hesabım", "hesabim", "eşleş", "esles")):
        return "me", ""
    if any(token in normalized for token in ("okunmamış", "okunmamis", "kaç bildirim", "kac bildirim", "yeni bildirim", "bildirim say")):
        match = re.search(r"(\d+)\s*(?:adet|tane|bildirim)?", normalized)
        return "notifications", match.group(1) if match else ""
    if any(token in normalized for token in ("bildirim", "notification")):
        match = re.search(r"(\d+)\s*(?:adet|tane|bildirim)?", normalized)
        return "notifications", match.group(1) if match else ""
    if any(token in normalized for token in ("echo", "geri döndür", "geri dondur")):
        return "echo", text.strip()

    return "", ""


def infer_blocked_operation_request(text: str) -> bool:
    normalized = re.sub(r"\s+", " ", text.strip().lower())
    if not normalized:
        return False

    has_blocked_verb = any(token in normalized for token in _BLOCKED_OPERATION_VERBS)
    has_blocked_target = any(token in normalized for token in _BLOCKED_OPERATION_TARGETS)
    return has_blocked_verb and has_blocked_target


def clamp_notification_limit(argument: str) -> int:
    if not argument:
        return MAX_NOTIFICATIONS_PER_REPLY
    try:
        requested = int(argument)
    except ValueError:
        return MAX_NOTIFICATIONS_PER_REPLY
    return max(1, min(MAX_NOTIFICATIONS_PER_REPLY, requested))


async def resolve_mytgo_user(db: AsyncSession, message: TelegramMessage) -> User | None:
    if message.from_user is None:
        return None

    app_user_id = telegram_user_map().get(message.from_user.id)
    if app_user_id is None:
        return None

    result = await db.execute(select(User).where(User.id == app_user_id, User.is_active.is_(True)))
    return result.scalar_one_or_none()


async def build_reply_text(db: AsyncSession, message: TelegramMessage) -> str | None:
    access_message = await ensure_telegram_access(db, message)
    if access_message is not None:
        return access_message

    if message.text is None:
        return None

    command, argument = normalize_command(message.text)
    if not command:
        command, argument = infer_natural_language_intent(message.text)

    if command == "start":
        return START_TEXT
    if command == "help":
        return HELP_TEXT
    if command == "health":
        return (
            f"e-car OK\n"
            f"Ortam: {settings.environment}\n"
            f"Public access: on\n"
            f"Password gate: on\n"
            f"Allowed chats: {len(allowed_chat_ids()) or 'all'}\n"
            f"Allowed users: {len(allowed_user_ids()) or 'all'}"
        )

    if infer_blocked_operation_request(message.text):
        return (
            "Bu tür operasyonel işlemleri yapamam. "
            "Yani uygulama durdurma, servis restart etme, sunucu yönetimi gibi aksiyonlar bende kapalı. "
            "İstersen MYTGO için kod değişikliği, test, push veya deploy isteği verebilirsin."
        )

    if command in {"me", "unread", "notifications"}:
        user = await resolve_mytgo_user(db, message)
        if user is None:
            return (
                "Bu Telegram hesabı için MYTGO kullanıcı eşlemesi yok.\n"
                "Yönetici `MYTGO_TELEGRAM_USER_MAP` ile eşleştirmeli."
            )

        if command == "me":
            return f"MYTGO kullanıcı: {user.full_name} (#{user.id}, {user.role.value})"

        if command == "unread":
            unread_count = await get_unread_notification_count(db, user)
            return f"{user.full_name} için okunmamış bildirim: {unread_count}"

        limit = clamp_notification_limit(argument)
        notifications = await list_notifications_for_user(db, user)
        selected = notifications[:limit]
        if not selected:
            return f"{user.full_name} için bildirim yok."

        lines = [f"Son {len(selected)} bildirim ({user.full_name}):"]
        for notification in selected:
            lines.append(f"- {notification.title}: {notification.body}")
        return "\n".join(lines)

    if command:
        coding_request = infer_coding_request(message.text)
        if coding_request is not None:
            return await run_coding_request(coding_request)
        user_name = message.from_user.first_name if message.from_user is not None else None
        return await generate_ai_reply(message.text, user_name=user_name)

    coding_request = infer_coding_request(message.text)
    if coding_request is not None:
        return await run_coding_request(coding_request)

    user_name = message.from_user.first_name if message.from_user is not None else None
    return await generate_ai_reply(message.text, user_name=user_name)


async def send_telegram_message(chat_id: int, text: str) -> None:
    token = settings.telegram_bot_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram bot token is not configured",
        )

    api_base = settings.telegram_api_base_url.rstrip("/")
    url = f"{api_base}/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "disable_web_page_preview": True}

    async with httpx.AsyncClient(timeout=settings.telegram_request_timeout_seconds) as client:
        response = await client.post(url, json=payload)
        if response.is_error:
            logger.warning(
                "telegram_send_error_response status=%s body=%s",
                response.status_code,
                response.text,
            )
        response.raise_for_status()


async def process_update(db: AsyncSession, update: TelegramUpdate) -> dict[str, object]:
    message = update.message or update.edited_message
    if message is None:
        return {"ok": True, "ignored": True, "reason": "no_message"}

    if not is_allowed_update(update):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Telegram chat or user is not allowlisted",
        )

    reply_text = await build_reply_text(db, message)
    if reply_text is None:
        return {"ok": True, "ignored": True, "reason": "no_text"}

    try:
        await send_telegram_message(message.chat.id, reply_text)
    except Exception as exc:  # pragma: no cover - live Telegram delivery guard
        logger.warning("telegram_delivery_failed", extra={"chat_id": message.chat.id, "error": str(exc)})
        return {"ok": True, "reply_text": reply_text, "delivery_error": str(exc)}

    return {"ok": True, "reply_text": reply_text}

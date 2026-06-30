import asyncio
import os
from pathlib import Path

os.environ["MYTGO_DATABASE_URL"] = "sqlite+aiosqlite:///./test_mytgo.db"
os.environ["MYTGO_JWT_SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.db.init_db import init_db  # noqa: E402
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.enums import UserRole  # noqa: E402
from app.models.notification import Notification  # noqa: E402
from app.models.telegram_auth import TelegramAuthGrant  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.coding_operator import build_codex_prompt, infer_coding_request  # noqa: E402
from app.services.telegram_ai import generate_ai_reply  # noqa: E402
from app.services.telegram_bot import AUTH_PROMPT_TEXT, AUTH_SUCCESS_TEXT  # noqa: E402

TEST_DB = Path("test_telegram_bridge.db")


def setup_module():
    if TEST_DB.exists():
        TEST_DB.unlink()


def _run(coro):
    return asyncio.run(coro)


async def _seed_user_with_notifications() -> int:
    await init_db()
    async with AsyncSessionLocal() as db:
        user = User(
            email="omer@example.com",
            phone=None,
            full_name="Omer",
            hashed_password="hashed",
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        db.add_all(
            [
                Notification(
                    user_id=user.id,
                    event_type="appointment.created",
                    title="Yeni servis randevusu",
                    body="#12 numaralı bakım talebi oluşturuldu.",
                ),
                Notification(
                    user_id=user.id,
                    event_type="appointment.quote_sent",
                    title="Servis teklifi hazır",
                    body="#12 numaralı randevu için teklif gönderildi.",
                    read_at=None,
                ),
            ]
        )
        await db.commit()
        return user.id


async def _seed_authenticated_telegram_user(telegram_user_id: int, display_name: str = "Omer") -> None:
    async with AsyncSessionLocal() as db:
        db.add(TelegramAuthGrant(telegram_user_id=telegram_user_id, display_name=display_name))
        await db.commit()


def test_telegram_webhook_prompts_for_password_on_first_message(monkeypatch):
    settings.telegram_bot_token = "test-bot-token"
    settings.telegram_webhook_secret_token = "bridge-secret"
    settings.telegram_allowed_chat_ids = "12345"
    settings.telegram_allowed_user_ids = "42"
    settings.telegram_user_map = ""

    sent_messages: list[tuple[int, str]] = []

    async def fake_send_telegram_message(chat_id: int, text: str) -> None:
        sent_messages.append((chat_id, text))

    monkeypatch.setattr("app.services.telegram_bot.send_telegram_message", fake_send_telegram_message)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "bridge-secret"},
            json={
                "update_id": 1,
                "message": {
                    "message_id": 10,
                    "chat": {"id": 12345, "type": "private"},
                    "from": {"id": 99, "is_bot": False, "first_name": "Omer"},
                    "text": "/start",
                },
            },
        )

    assert response.status_code == 200, response.text
    assert response.json()["ok"] is True
    assert response.json()["reply_text"] == AUTH_PROMPT_TEXT
    assert sent_messages == [(12345, AUTH_PROMPT_TEXT)]


def test_telegram_webhook_routes_to_mytgo_notifications(monkeypatch):
    settings.telegram_bot_token = "test-bot-token"
    settings.telegram_webhook_secret_token = "bridge-secret"
    settings.telegram_allowed_chat_ids = "12345"
    settings.telegram_allowed_user_ids = "42"

    sent_messages: list[tuple[int, str]] = []

    async def fake_send_telegram_message(chat_id: int, text: str) -> None:
        sent_messages.append((chat_id, text))

    with TestClient(app) as client:
        user_id = _run(_seed_user_with_notifications())
        settings.telegram_user_map = f"42:{user_id}"
        _run(_seed_authenticated_telegram_user(42))

        async def fake_resolve_mytgo_user(db, message):
            return type(
                "StubUser",
                (),
                {"id": user_id, "full_name": "Omer", "role": UserRole.CUSTOMER},
            )()

        monkeypatch.setattr("app.services.telegram_bot.send_telegram_message", fake_send_telegram_message)
        monkeypatch.setattr("app.services.telegram_bot.resolve_mytgo_user", fake_resolve_mytgo_user)

        response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "bridge-secret"},
            json={
                "update_id": 2,
                "message": {
                    "message_id": 11,
                    "chat": {"id": 12345, "type": "private"},
                    "from": {"id": 42, "is_bot": False, "first_name": "Omer"},
                    "text": "/notifications 2",
                },
            },
        )

    assert response.status_code == 200, response.text
    assert "Son 2 bildirim (Omer):" in response.json()["reply_text"]
    assert "Yeni servis randevusu" in response.json()["reply_text"]
    assert sent_messages == [(12345, response.json()["reply_text"])]



def test_telegram_webhook_routes_natural_language_notifications(monkeypatch):
    settings.telegram_bot_token = "test-bot-token"
    settings.telegram_webhook_secret_token = "bridge-secret"
    settings.telegram_allowed_chat_ids = "12345"
    settings.telegram_allowed_user_ids = "42"

    sent_messages: list[tuple[int, str]] = []

    async def fake_send_telegram_message(chat_id: int, text: str) -> None:
        sent_messages.append((chat_id, text))

    async def fake_resolve_mytgo_user(db, message):
        return type(
            "StubUser",
            (),
            {"id": user_id, "full_name": "Omer", "role": UserRole.CUSTOMER},
        )()

    monkeypatch.setattr("app.services.telegram_bot.send_telegram_message", fake_send_telegram_message)
    monkeypatch.setattr("app.services.telegram_bot.resolve_mytgo_user", fake_resolve_mytgo_user)

    with TestClient(app) as client:
        user_id = _run(_seed_user_with_notifications())
        settings.telegram_user_map = f"42:{user_id}"
        _run(_seed_authenticated_telegram_user(42))

        response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "bridge-secret"},
            json={
                "update_id": 5,
                "message": {
                    "message_id": 14,
                    "chat": {"id": 12345, "type": "private"},
                    "from": {"id": 42, "is_bot": False, "first_name": "Omer"},
                    "text": "bildirimlerimi göster 2",
                },
            },
        )

    assert response.status_code == 200, response.text
    assert "Son 2 bildirim (Omer):" in response.json()["reply_text"]
    assert sent_messages == [(12345, response.json()["reply_text"])]


def test_telegram_webhook_routes_coding_request(monkeypatch):
    settings.telegram_bot_token = "test-bot-token"
    settings.telegram_webhook_secret_token = "bridge-secret"
    settings.telegram_allowed_chat_ids = "12345"
    settings.telegram_allowed_user_ids = "42"
    settings.codex_repository_path = "/home/ubuntu/MYTGO/mytgo-backend"
    settings.codex_model = "gpt-5.4-mini"
    settings.codex_allowed_branches = "feature/*"

    sent_messages: list[tuple[int, str]] = []

    async def fake_send_telegram_message(chat_id: int, text: str) -> None:
        sent_messages.append((chat_id, text))

    async def fake_run_coding_request(request):
        assert request.action == "implement"
        return "Kod görevi tamamlandı.\nDurum: başarılı\nCodex notu: 2 dosya güncellendi."

    monkeypatch.setattr("app.services.telegram_bot.send_telegram_message", fake_send_telegram_message)
    monkeypatch.setattr("app.services.telegram_bot.run_coding_request", fake_run_coding_request)

    with TestClient(app) as client:
        _run(_seed_authenticated_telegram_user(42))
        response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "bridge-secret"},
            json={
                "update_id": 6,
                "message": {
                    "message_id": 15,
                    "chat": {"id": 12345, "type": "private"},
                    "from": {"id": 42, "is_bot": False, "first_name": "Omer"},
                    "text": "mytgo uygulamasına buton ekle",
                },
            },
        )

    assert response.status_code == 200, response.text
    assert response.json()["reply_text"].startswith("Kod görevi tamamlandı.")
    assert "Durum: başarılı" in response.json()["reply_text"]
    assert "2 dosya güncellendi" in response.json()["reply_text"]
    assert sent_messages == [(12345, response.json()["reply_text"])]


def test_telegram_webhook_routes_plain_text_to_ai(monkeypatch):
    settings.telegram_bot_token = "test-bot-token"
    settings.telegram_webhook_secret_token = "bridge-secret"
    settings.telegram_allowed_chat_ids = "12345"
    settings.telegram_allowed_user_ids = "42"

    sent_messages: list[tuple[int, str]] = []

    async def fake_send_telegram_message(chat_id: int, text: str) -> None:
        sent_messages.append((chat_id, text))

    async def fake_generate_ai_reply(message_text: str, *, user_name: str | None = None) -> str:
        return f"AI: {user_name or 'Anon'} dedi ki -> {message_text}"

    monkeypatch.setattr("app.services.telegram_bot.send_telegram_message", fake_send_telegram_message)
    monkeypatch.setattr("app.services.telegram_bot.generate_ai_reply", fake_generate_ai_reply)

    with TestClient(app) as client:
        _run(_seed_authenticated_telegram_user(42))
        response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "bridge-secret"},
            json={
                "update_id": 7,
                "message": {
                    "message_id": 16,
                    "chat": {"id": 12345, "type": "private"},
                    "from": {"id": 42, "is_bot": False, "first_name": "Omer"},
                    "text": "Selam",
                },
            },
        )

    assert response.status_code == 200, response.text
    assert response.json()["reply_text"] == "AI: Omer dedi ki -> Selam"
    assert sent_messages == [(12345, "AI: Omer dedi ki -> Selam")]


def test_generate_ai_reply_uses_e_car_identity_when_fallback(monkeypatch):
    settings.telegram_ai_provider = "off"
    settings.openai_api_key = ""

    reply = _run(generate_ai_reply("selam", user_name="Omer"))

    assert "MYTGO asistanıyım" in reply


def test_telegram_webhook_refuses_operational_restart_requests(monkeypatch):
    telegram_user_id = 4201
    settings.telegram_bot_token = "test-bot-token"
    settings.telegram_webhook_secret_token = "bridge-secret"
    settings.telegram_allowed_chat_ids = "12345"
    settings.telegram_allowed_user_ids = str(telegram_user_id)

    sent_messages: list[tuple[int, str]] = []

    async def fake_send_telegram_message(chat_id: int, text: str) -> None:
        sent_messages.append((chat_id, text))

    monkeypatch.setattr("app.services.telegram_bot.send_telegram_message", fake_send_telegram_message)

    with TestClient(app) as client:
        _run(_seed_authenticated_telegram_user(telegram_user_id))
        response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "bridge-secret"},
            json={
                "update_id": 99,
                "message": {
                    "message_id": 99,
                    "chat": {"id": 12345, "type": "private"},
                    "from": {"id": telegram_user_id, "is_bot": False, "first_name": "Omer"},
                    "text": "uygulamayı durdur ve sunucuyu restart et",
                },
            },
        )

    assert response.status_code == 200, response.text
    assert "operasyonel işlemleri yapamam" in response.json()["reply_text"]
    assert len(sent_messages) == 1
    assert "operasyonel işlemleri yapamam" in sent_messages[0][1]


def test_coding_operator_prompt_builds_with_model_and_repo():
    settings.codex_repository_path = "/home/ubuntu/MYTGO/mytgo-backend"
    settings.codex_model = "gpt-5.4-mini"
    settings.codex_allowed_branches = "feature/*"

    request = infer_coding_request("GitHub'a pushla ve canlıya al")
    assert request is not None
    prompt = build_codex_prompt(request)

    assert "/home/ubuntu/MYTGO/mytgo-backend" in prompt
    assert "gpt-5.4-mini" in prompt
    assert "GitHub'a pushla ve canlıya al" in prompt
    assert "deploy" in prompt


def test_telegram_webhook_prompts_for_password_before_access():
    settings.telegram_bot_token = "test-bot-token"
    settings.telegram_webhook_secret_token = "bridge-secret"
    settings.telegram_allowed_chat_ids = ""
    settings.telegram_allowed_user_ids = ""
    settings.telegram_user_map = "42:1"

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "bridge-secret"},
            json={
                "update_id": 3,
                "message": {
                    "message_id": 12,
                    "chat": {"id": 99999, "type": "private"},
                    "from": {"id": 99, "is_bot": False, "first_name": "Outsider"},
                    "text": "/start",
                },
            },
        )

    assert response.status_code == 200, response.text
    assert response.json()["reply_text"] == AUTH_PROMPT_TEXT


def test_telegram_webhook_accepts_password_and_unlocks_future_messages(monkeypatch):
    settings.telegram_bot_token = "test-bot-token"
    settings.telegram_webhook_secret_token = "bridge-secret"
    settings.telegram_allowed_chat_ids = ""
    settings.telegram_allowed_user_ids = ""
    settings.telegram_user_map = ""

    sent_messages: list[tuple[int, str]] = []

    async def fake_send_telegram_message(chat_id: int, text: str) -> None:
        sent_messages.append((chat_id, text))

    async def fake_generate_ai_reply(message_text: str, *, user_name: str | None = None) -> str:
        return f"AI: {user_name or 'Anon'} dedi ki -> {message_text}"

    monkeypatch.setattr("app.services.telegram_bot.send_telegram_message", fake_send_telegram_message)
    monkeypatch.setattr("app.services.telegram_bot.generate_ai_reply", fake_generate_ai_reply)

    _run(init_db())

    with TestClient(app) as client:
        auth_response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "bridge-secret"},
            json={
                "update_id": 31,
                "message": {
                    "message_id": 100,
                    "chat": {"id": 1000, "type": "private"},
                    "from": {"id": 100, "is_bot": False, "first_name": "Omer"},
                    "text": "2525",
                },
            },
        )
        reply_response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "bridge-secret"},
            json={
                "update_id": 32,
                "message": {
                    "message_id": 101,
                    "chat": {"id": 1000, "type": "private"},
                    "from": {"id": 100, "is_bot": False, "first_name": "Omer"},
                    "text": "Selam",
                },
            },
        )

    assert auth_response.status_code == 200, auth_response.text
    assert auth_response.json()["reply_text"] == AUTH_SUCCESS_TEXT
    assert reply_response.status_code == 200, reply_response.text
    assert reply_response.json()["reply_text"] == "AI: Omer dedi ki -> Selam"
    assert sent_messages == [
        (1000, AUTH_SUCCESS_TEXT),
        (1000, "AI: Omer dedi ki -> Selam"),
    ]

def test_telegram_webhook_rejects_bad_secret():
    settings.telegram_bot_token = "test-bot-token"
    settings.telegram_webhook_secret_token = "bridge-secret"
    settings.telegram_allowed_chat_ids = ""
    settings.telegram_allowed_user_ids = ""
    settings.telegram_user_map = ""

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "wrong-secret"},
            json={
                "update_id": 4,
                "message": {
                    "message_id": 13,
                    "chat": {"id": 777, "type": "private"},
                    "from": {"id": 777, "is_bot": False, "first_name": "Test"},
                    "text": "/help",
                },
            },
        )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "Invalid Telegram webhook secret token"


def test_telegram_webhook_rejects_updates_outside_allowlist():
    settings.telegram_bot_token = "test-bot-token"
    settings.telegram_webhook_secret_token = "bridge-secret"
    settings.telegram_allowed_chat_ids = "12345"
    settings.telegram_allowed_user_ids = "42"
    settings.telegram_user_map = ""

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "bridge-secret"},
            json={
                "update_id": 8,
                "message": {
                    "message_id": 17,
                    "chat": {"id": 99999, "type": "private"},
                    "from": {"id": 777, "is_bot": False, "first_name": "Intruder"},
                    "text": "/help",
                },
            },
        )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "Telegram chat or user is not allowlisted"

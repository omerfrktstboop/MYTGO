import os

os.environ["MYTGO_DATABASE_URL"] = "sqlite+aiosqlite:///./test_mytgo.db"
os.environ["MYTGO_JWT_SECRET_KEY"] = "test-secret"
os.environ["MYTGO_TELEGRAM_BOT_TOKEN"] = "test-bot-token"
os.environ["MYTGO_TELEGRAM_WEBHOOK_SECRET_TOKEN"] = "bridge-secret"

from app.core.config import settings  # noqa: E402
from scripts.setup_telegram_webhook import set_webhook  # noqa: E402


def test_webhook_payload_includes_secret(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self):
            return {"ok": True}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, json=None):
            captured["url"] = url
            captured["json"] = json
            return FakeResponse()

    monkeypatch.setattr("scripts.setup_telegram_webhook.httpx.AsyncClient", FakeClient)

    result = __import__("asyncio").run(set_webhook("https://example.com/webhook", drop_pending_updates=True))

    assert result == {"ok": True}
    assert captured["url"].endswith("/bottest-bot-token/setWebhook")
    assert captured["json"]["url"] == "https://example.com/webhook"
    assert captured["json"]["secret_token"] == "bridge-secret"
    assert captured["json"]["drop_pending_updates"] is True

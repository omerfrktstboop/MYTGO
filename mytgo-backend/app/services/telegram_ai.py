from __future__ import annotations

import re

try:  # pragma: no cover - optional dependency
    from openai import AsyncOpenAI
except ImportError:  # pragma: no cover - graceful fallback when SDK is unavailable
    AsyncOpenAI = None

from app.core.config import settings

_AI_SYSTEM_PROMPT = (
    "Sen MYTGO için çalışan kısa, doğal ve yardımsever bir Telegram asistanısın. "
    "Cevapların Türkçe, kısa ve net olsun. "
    "Normal sorulara doğal şekilde cevap ver. "
    "MYTGO tarafında geliştirme, kod, test, push ve deploy konularında yardımcı ol. "
    "Kullanıcı açıkça operasyonel bir işlem isterse — örneğin uygulamayı durdurma, sunucuyu restart etme, servis kapatma — bunu kısa şekilde reddet. "
    "Kullanıcı sormadıkça yapamadığın şeyleri kendiliğinden anlatma. "
    "Kullanıcı selam verirse sıcak bir şekilde karşılık ver ve yardım odağını kısa söyle."
)

_FALLBACK_GREETINGS = (
    "selam",
    "selamlar",
    "merhaba",
    "hey",
    "hi",
    "hello",
    "sa",
)


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _looks_like_greeting(text: str) -> bool:
    normalized = _normalize_text(text)
    return any(token == normalized or token in normalized for token in _FALLBACK_GREETINGS)


def _fallback_reply(message_text: str) -> str:
    normalized = _normalize_text(message_text)
    if _looks_like_greeting(message_text):
        return "Selam! Ben MYTGO asistanıyım. Sorularını cevaplayabilir, MYTGO tarafında geliştirme konularında yardımcı olabilirim."
    if any(token in normalized for token in ("restart", "yeniden başlat", "yeniden baslat", "durdur", "stop", "kapat")):
        return "Bu operasyonel işlemi yapamam. İstersen MYTGO tarafında kod, test, push veya deploy konusunda yardımcı olayım."
    return "Ne istediğini anladım. İstersen bunu MYTGO tarafında net bir görev olarak biraz daha açabilirsin."


def _extract_openai_text(response: object) -> str:
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()
    return ""


async def generate_ai_reply(message_text: str, *, user_name: str | None = None) -> str:
    provider = settings.telegram_ai_provider.strip().lower()
    if provider == "off":
        return _fallback_reply(message_text)

    if settings.openai_api_key and AsyncOpenAI is not None:
        try:
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            prompt_parts: list[str] = []
            if user_name:
                prompt_parts.append(f"Kullanıcı adı: {user_name}")
            prompt_parts.append(f"Mesaj: {message_text.strip()}")
            prompt = "\n".join(prompt_parts)
            response = await client.responses.create(
                model=settings.telegram_ai_model,
                input=[
                    {"role": "system", "content": _AI_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_output_tokens=180,
            )
            text = _extract_openai_text(response)
            if text:
                return text
        except Exception:
            # Fall back to a deterministic response if the provider is unavailable.
            pass

    return _fallback_reply(message_text)

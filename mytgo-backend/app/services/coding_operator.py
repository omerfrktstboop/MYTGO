from __future__ import annotations

from dataclasses import dataclass
import asyncio
import re
import tempfile
from pathlib import Path
from typing import Awaitable, Callable

from app.core.config import settings


@dataclass(frozen=True)
class CodingOperatorRequest:
    raw_text: str
    action: str
    summary: str
    confidence: str
    requires_confirmation: bool


_CODE_KEYWORDS = (
    "ekle",
    "oluştur",
    "olustur",
    "yap",
    "geliştir",
    "gelistir",
    "değiştir",
    "degistir",
    "düzelt",
    "duzelt",
    "fix",
    "bug",
    "hata",
    "logo",
    "ikon",
    "buton",
    "ekran",
    "sayfa",
    "modal",
    "form",
    "component",
    "refactor",
    "temizle",
    "optimize",
    "github",
    "push",
    "commit",
    "pr",
    "pull request",
    "deploy",
    "canlıya al",
    "canliya al",
    "prod",
    "production",
    "staging",
)

_DEPLOY_KEYWORDS = ("deploy", "canlıya al", "canliya al", "prod", "production")
_PUSH_KEYWORDS = ("push", "github", "commit", "pr", "pull request")
_FIX_KEYWORDS = ("düzelt", "duzelt", "fix", "bug", "hata", "kırık", "kirik", "sorun")
_PLAN_KEYWORDS = (
    "planla",
    "tasarla",
    "özetle",
    "ozetle",
    "analiz et",
    "incele",
    "öner",
    "oner",
    "öneri",
    "oneri",
    "tavsiye",
    "fikir",
    "nasıl geliştir",
    "nasil gelistir",
    "ne ekleyebilir",
)


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def looks_like_coding_request(text: str) -> bool:
    normalized = _normalize_text(text)
    return any(keyword in normalized for keyword in (*_CODE_KEYWORDS, *_PLAN_KEYWORDS))


def infer_coding_request(text: str) -> CodingOperatorRequest | None:
    normalized = _normalize_text(text)
    if not normalized:
        return None

    if not looks_like_coding_request(normalized):
        return None

    if any(keyword in normalized for keyword in _DEPLOY_KEYWORDS):
        action = "deploy"
        confidence = "high"
    elif any(keyword in normalized for keyword in _PUSH_KEYWORDS):
        action = "push"
        confidence = "high"
    elif any(keyword in normalized for keyword in _FIX_KEYWORDS):
        action = "fix"
        confidence = "high"
    elif any(keyword in normalized for keyword in _PLAN_KEYWORDS):
        action = "plan"
        confidence = "medium"
    else:
        action = "implement"
        confidence = "medium"

    requires_confirmation = action in {"deploy", "push", "plan"}
    summary = text.strip()
    return CodingOperatorRequest(
        raw_text=text.strip(),
        action=action,
        summary=summary,
        confidence=confidence,
        requires_confirmation=requires_confirmation,
    )


async def run_chat_reply(message_text: str, *, user_name: str | None = None) -> str:
    """Codex CLI ile genel sohbet cevabı üretir (salt okunur modda)."""
    repo_path = Path(settings.codex_repository_path).expanduser()
    prompt = (
        "Sen E-Cars için çalışan kısa, doğal ve yardımsever bir Telegram asistanısın.\n"
        "Cevapların Türkçe, kısa ve net olsun. Sadece cevap ver.\n"
        "Kesinlikle kod değiştirme, dosya oluşturma, commit veya push yapma.\n"
        "Sadece sorulan soruya doğal bir insan gibi cevap ver.\n"
    )
    if user_name:
        prompt += f"Kullanıcı adı: {user_name}\n"
    prompt += f"Mesaj: {message_text.strip()}"

    with tempfile.NamedTemporaryFile(prefix="mytgo-chat-", suffix=".txt", delete=False) as handle:
        last_message_path = Path(handle.name)

    cmd = [
        "/home/ubuntu/.nvm/versions/node/v22.23.1/bin/codex",
        "exec",
        "--model",
        settings.codex_model,
        "--cd",
        str(repo_path),
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--output-last-message",
        str(last_message_path),
        prompt,
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout_bytes, stderr_bytes = await process.communicate()
    last_message = ""
    if last_message_path.exists():
        last_message = last_message_path.read_text(encoding="utf-8", errors="replace").strip()
        try:
            last_message_path.unlink()
        except OSError:
            pass

    if last_message:
        return last_message

    stdout_text = stdout_bytes.decode("utf-8", errors="replace").strip()
    if stdout_text:
        return _trim(stdout_text)

    return "Bu soruya cevap veremedim, biraz daha açabilir misin?"


def build_codex_prompt(request: CodingOperatorRequest) -> str:
    repo_path = Path(settings.codex_repository_path).expanduser()
    allowed_branches = settings.codex_allowed_branches.strip() or "main"
    return (
        "Sen Codex CLI ile çalışan bir E-Cars kod operatörüsün.\n"
        f"Repo yolu: {repo_path}\n"
        f"Tercih edilen model: {settings.codex_model}\n"
        f"İzinli branch politikası: {allowed_branches}\n"
        "Kurallar:\n"
        "- Sadece bu repo içinde değişiklik yap.\n"
        "- Gizli bilgi, token veya credential yazdırma.\n"
        "- Önce analiz et, sonra gerekirse kodu değiştir, test çalıştır.\n"
        "- Feature branch açma, pull request oluşturma.\n"
        "- Değişiklikleri doğrudan main branch üzerinde commit et ve kullanıcı push/deploy istiyorsa doğrudan main'e push et.\n"
        "- Eğer kullanıcı deploy istiyorsa push sonrası deploy adımlarını da dahil et.\n"
        "- Çıktıyı kısa, net ve uygulanabilir ver.\n"
        "Kullanıcı isteği:\n"
        f"{request.raw_text}\n"
        f"Algılanan niyet: {request.action} / confidence={request.confidence}\n"
        "İstenen çıktı: yapılan değişiklik özeti, çalıştırılan testler, git durumu, push/deploy sonucu ve branch bilgisi."
    )


def build_coding_ack(request: CodingOperatorRequest) -> str:
    lines = [
        "Bu istek kod/deploy talebi olarak algılandı.",
        f"Niyet: {request.action} ({request.confidence})",
        f"Özet: {request.summary}",
        f"Repo: {settings.codex_repository_path}",
        f"Model: {settings.codex_model}",
    ]
    if request.requires_confirmation:
        lines.append("Durum: push/deploy için ek onay gerekli.")
    else:
        lines.append("Durum: kod görevi çalıştırılıyor.")
    return "\n".join(lines)


def build_coding_confirmation_text(request: CodingOperatorRequest) -> str:
    if request.action == "plan":
        return (
            "Bunu hemen kod değişikliği gibi çalıştırmayayım.\n"
            f"İstersen şu geliştirme yönünde ilerleyebilirim: {request.summary}\n"
            "Uygunsa `onay` yaz, ben kod tarafına geçeyim. Push için ayrıca `pushla` demen yeterli."
        )

    if request.action == "push":
        return (
            f"Push isteğini aldım: {request.summary}\n"
            "Uygunsa `onay` yaz, değişiklikleri GitHub'a göndereyim."
        )

    if request.action == "deploy":
        return (
            f"Deploy isteğini aldım: {request.summary}\n"
            "Uygunsa `onay` yaz, push gerekiyorsa yapıp ardından deploy sürecini başlatayım."
        )

    return (
        f"İstersen şu geliştirmeyi uygulayabilirim: {request.summary}\n"
        "Uygunsa `onay` yaz, kod değişikliğini başlatayım. Push istersen onu ayrıca yaparım."
    )


def _trim(text: str, limit: int = 1400) -> str:
    clean = text.strip()
    if len(clean) <= limit:
        return clean
    return clean[: limit - 3].rstrip() + "..."


def _action_completion_title(action: str) -> str:
    return {
        "implement": "Kod geliştirmesi tamamlandı.",
        "fix": "Düzeltme tamamlandı.",
        "push": "Push işlemi tamamlandı.",
        "deploy": "Deploy işlemi tamamlandı.",
        "plan": "Öneri hazır.",
    }.get(action, "İşlem tamamlandı.")


ProgressCallback = Callable[[str], Awaitable[None]]


async def run_coding_request(
    request: CodingOperatorRequest,
    *,
    progress_callback: ProgressCallback | None = None,
) -> str:
    repo_path = Path(settings.codex_repository_path).expanduser()
    prompt = build_codex_prompt(request)

    async def report(text: str) -> None:
        if progress_callback is not None:
            await progress_callback(text)

    async def heartbeat() -> None:
        updates = (
            "Kod görevi çalışıyor, kısa bir kontrol yapıyorum.",
            "Hâlâ çalışıyor, değişiklik ve testleri topluyorum.",
            "İşlem sürüyor, sonuçları hazırlıyorum.",
        )
        index = 0
        try:
            while True:
                await asyncio.sleep(6)
                await report(updates[index % len(updates)])
                index += 1
        except asyncio.CancelledError:
            raise

    await report("İsteği aldım, kod görevini başlatıyorum.")

    with tempfile.NamedTemporaryFile(prefix="mytgo-codex-", suffix=".txt", delete=False) as handle:
        last_message_path = Path(handle.name)

    cmd = [
        "/home/ubuntu/.nvm/versions/node/v22.23.1/bin/codex",
        "exec",
        "--model",
        settings.codex_model,
        "--cd",
        str(repo_path),
        "--sandbox",
        "workspace-write",
        "--dangerously-bypass-approvals-and-sandbox",
        "--output-last-message",
        str(last_message_path),
        prompt,
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await report("Codex çalışıyor, bu adım biraz sürebilir.")
    heartbeat_task = asyncio.create_task(heartbeat())
    stdout_bytes, stderr_bytes = await process.communicate()
    heartbeat_task.cancel()
    try:
        await heartbeat_task
    except asyncio.CancelledError:
        pass
    stdout_text = stdout_bytes.decode("utf-8", errors="replace").strip()
    stderr_text = stderr_bytes.decode("utf-8", errors="replace").strip()
    last_message = ""
    if last_message_path.exists():
        last_message = last_message_path.read_text(encoding="utf-8", errors="replace").strip()
        try:
            last_message_path.unlink()
        except OSError:
            pass

    git_status = ""
    await report("Codex tamamlandı, git durumunu topluyorum.")
    try:
        git_process = await asyncio.create_subprocess_exec(
            "git",
            "-C",
            str(repo_path),
            "status",
            "--short",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        git_stdout, _ = await git_process.communicate()
        git_status = git_stdout.decode("utf-8", errors="replace").strip()
    except Exception:
        git_status = ""

    parts = [_action_completion_title(request.action)]
    if process.returncode == 0:
        parts.append("Durum: başarılı")
    else:
        parts.append(f"Durum: başarısız (exit {process.returncode})")

    if last_message:
        parts.append(f"Codex notu: {_trim(last_message)}")
    elif stdout_text:
        parts.append(f"Codex çıktısı: {_trim(stdout_text)}")

    if git_status:
        parts.append("Değişen dosyalar:\n" + "\n".join(f"- {line}" for line in git_status.splitlines()))

    if stderr_text and process.returncode != 0:
        parts.append(f"Hata: {_trim(stderr_text)}")

    await report("Son mesaj hazırlanıyor.")
    return "\n".join(parts)

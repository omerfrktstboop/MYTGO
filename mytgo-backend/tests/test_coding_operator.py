from app.core.config import settings
from app.services.coding_operator import CodingOperatorRequest, build_codex_prompt


def test_build_codex_prompt_prefers_main_and_no_pr():
    original_repo = settings.codex_repository_path
    original_model = settings.codex_model
    original_allowed = settings.codex_allowed_branches
    try:
        settings.codex_repository_path = "/home/ubuntu/MYTGO/mytgo-backend"
        settings.codex_model = "gpt-5.4-mini"
        settings.codex_allowed_branches = ""

        request = CodingOperatorRequest(
            raw_text="MYTGO'da ödeme ekranını düzelt ve canlıya al",
            action="deploy",
            summary="ödeme ekranını düzelt ve canlıya al",
            confidence="high",
            requires_confirmation=False,
        )

        prompt = build_codex_prompt(request)

        assert "İzinli branch politikası: main" in prompt
        assert "Feature branch açma, pull request oluşturma." in prompt
        assert "doğrudan main branch üzerinde commit et" in prompt
        assert "doğrudan main'e push et" in prompt
        assert "push/deploy sonucu ve branch bilgisi" in prompt
    finally:
        settings.codex_repository_path = original_repo
        settings.codex_model = original_model
        settings.codex_allowed_branches = original_allowed

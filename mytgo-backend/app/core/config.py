from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MYTGO API"
    environment: str = "development"

    database_url: str = "sqlite+aiosqlite:///./mytgo.db"
    sql_echo: bool = False

    jwt_secret_key: str = "change-this-secret-before-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    demo_password: str = "DemoPass123!"

    telegram_bot_token: str | None = None
    telegram_webhook_secret_token: str | None = None
    telegram_allowed_chat_ids: str = ""
    telegram_allowed_user_ids: str = ""
    telegram_user_map: str = ""
    telegram_access_password: str = "2525"
    telegram_api_base_url: str = "https://api.telegram.org"
    telegram_request_timeout_seconds: float = 10.0

    openai_api_key: str | None = None
    telegram_ai_model: str = "gpt-4o-mini"
    telegram_ai_provider: str = "auto"

    codex_repository_path: str = "/home/ubuntu/MYTGO"
    codex_model: str = "gpt-5.4-mini"
    codex_auto_push_enabled: bool = False
    codex_auto_deploy_enabled: bool = False
    codex_allowed_branches: str = ""

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "capacitor://localhost",
        "http://localhost",
    ]

    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="MYTGO_",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()

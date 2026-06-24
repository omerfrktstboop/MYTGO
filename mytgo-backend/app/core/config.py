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

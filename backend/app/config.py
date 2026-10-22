from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Источник событий: "kudago" (с откатом на моки) или "mock"
    events_source: str = "kudago"
    kudago_base_url: str = "https://kudago.com/public-api/v1.4"
    events_cache_ttl: int = 600

    http_timeout: float = 8.0
    static_dir: str = "static"  # собранный фронтенд в Docker-образе
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()

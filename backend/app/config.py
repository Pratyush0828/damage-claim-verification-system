from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ClaimLens AI"
    environment: str = "development"
    api_v1_prefix: str = ""
    secret_key: str = Field(default="change-me-in-production")
    access_token_expire_minutes: int = 1440
    database_url: str = "sqlite:///./claimlens.db"
    cors_origins: str = "http://localhost:5173"

    storage_backend: str = "local"
    local_upload_dir: str = "uploads"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "us-east-1"
    s3_bucket: str | None = None

    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    enable_local_ml: bool = False
    max_upload_mb: int = 12

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def upload_path(self) -> Path:
        path = Path(self.local_upload_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


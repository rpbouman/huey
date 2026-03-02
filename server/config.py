"""
QueryService configuration loader.

Loads settings from environment variables and optional config file.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with env override."""

    model_config = SettingsConfigDict(
        env_prefix="QUERYSERVICE_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"

    # Optional: S3 / engine config (for later issues)
    s3_bucket: Optional[str] = None
    s3_region: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()

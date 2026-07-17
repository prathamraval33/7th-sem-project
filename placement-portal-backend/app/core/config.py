"""Application configuration.

Loads all environment-driven settings via pydantic-settings and configures
Python's `logging` module for structured, non-print application logging.
"""
import logging
import sys
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Groq (server-side only — never exposed to the frontend)
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # SMTP — used to send signup/forgot-password/change-password OTP emails
    SMTP_HOST: str
    SMTP_PORT: int = 587
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    SMTP_FROM_EMAIL: str
    SMTP_FROM_NAME: str = "Placement Portal"
    SMTP_USE_TLS: bool = True

    # Live web search — powers Live Career Insights (Tavily/Serper, provider-agnostic)
    SEARCH_PROVIDER: str = "tavily"
    SEARCH_API_KEY: str

    # Logging
    LOG_LEVEL: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def configure_logging() -> None:
    """Configure structured, process-wide logging.

    Wired here in Phase 1 per the master prompt's production-readiness
    requirement ("Logging: structured request/error logging ... not bare
    print() statements"). Later phases (routers/services) should use
    `logging.getLogger(__name__)` rather than `print()`.
    """
    log_format = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
        format=log_format,
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # Keep noisy third-party loggers from drowning out application logs.
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("passlib").setLevel(logging.WARNING)


configure_logging()

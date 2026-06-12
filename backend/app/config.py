import os
from dataclasses import dataclass


@dataclass
class Config:
    SECRET_KEY: str = os.getenv("FLASK_SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL", "postgresql://wc26:wc26@localhost:5432/wc26"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SYNC_SCRAPERS: bool = os.getenv("SYNC_SCRAPERS", "true").lower() == "true"
    APP_DOMAIN: str = os.getenv("APP_DOMAIN", "http://localhost:5173")
    VAPID_PUBLIC_KEY: str = os.getenv("VAPID_PUBLIC_KEY", "")
    VAPID_PRIVATE_KEY: str = os.getenv("VAPID_PRIVATE_KEY", "")
    VAPID_CONTACT_EMAIL: str = os.getenv("VAPID_CONTACT_EMAIL", "mailto:admin@example.com")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    AUTH_FROM_EMAIL: str = os.getenv("AUTH_FROM_EMAIL", "")
    AUTH_TOKEN_TTL_MINUTES: int = int(os.getenv("AUTH_TOKEN_TTL_MINUTES", "15"))
    SESSION_COOKIE_MAX_AGE: int = int(os.getenv("SESSION_COOKIE_MAX_AGE", "2592000"))
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    APPLE_CLIENT_ID: str = os.getenv("APPLE_CLIENT_ID", "")
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    ESPN_COMMENTARY_DELAY: float = float(os.getenv("ESPN_COMMENTARY_DELAY", "6"))
    API_FOOTBALL_KEY: str = os.getenv("API_FOOTBALL_KEY", "")
    API_FOOTBALL_SEASON: int = int(os.getenv("API_FOOTBALL_SEASON", "2026"))


class DevelopmentConfig(Config):
    DEBUG: bool = True
    CORS_ORIGINS: str | list[str] = "*"


class ProductionConfig(Config):
    DEBUG: bool = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}

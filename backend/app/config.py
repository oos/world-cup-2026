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


class DevelopmentConfig(Config):
    DEBUG: bool = True


class ProductionConfig(Config):
    DEBUG: bool = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}

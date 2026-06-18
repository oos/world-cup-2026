import os

from flask import Flask

from app.api import register_blueprints
from app.cli import register_commands
from app.config import config_by_name
from app.extensions import cors, db, migrate


def create_app(config_name: str | None = None) -> Flask:
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    config_class = config_by_name.get(config_name, config_by_name["development"])
    app.config.from_object(config_class)

    if app.config.get("DEBUG"):
        app.config["CORS_ORIGINS"] = "*"
    else:
        app.config["CORS_ORIGINS"] = [app.config["APP_DOMAIN"].rstrip("/")]

    db.init_app(app)
    migrate.init_app(app, db)

    cors_origins = app.config.get("CORS_ORIGINS", "*")
    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": cors_origins,
                "supports_credentials": True,
            }
        },
    )

    register_blueprints(app)
    register_commands(app)

    if config_name == "development" and not os.getenv("WC26_SKIP_DB_BOOTSTRAP"):
        with app.app_context():
            from app.db_bootstrap import ensure_database_ready

            ensure_database_ready(app.config["SQLALCHEMY_DATABASE_URI"])

    return app

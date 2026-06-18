#!/bin/sh
set -e

echo "Checking database schema..."
flask --app wsgi db upgrade

python <<'PY'
from app import create_app
from app.db_bootstrap import ensure_database_ready

app = create_app("development")
with app.app_context():
    ensure_database_ready(app.config["SQLALCHEMY_DATABASE_URI"])
PY

echo "Starting API server..."
exec flask --app wsgi run --host 0.0.0.0 --port 5000 --debug

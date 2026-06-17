#!/bin/sh
set -e

echo "Checking database schema..."
flask --app wsgi db upgrade

python <<'PY'
import os
import subprocess
import sys

from sqlalchemy import create_engine, text

url = os.environ["DATABASE_URL"]
engine = create_engine(url)

with engine.connect() as conn:
    tables_ok = conn.execute(
        text("SELECT to_regclass('public.tournaments') IS NOT NULL")
    ).scalar()
    row_count = 0
    if tables_ok:
        row_count = conn.execute(text("SELECT COUNT(*) FROM tournaments")).scalar() or 0

if not tables_ok:
    print("Schema missing with stale migration state — rebuilding...")
    subprocess.check_call(["flask", "--app", "wsgi", "db", "stamp", "base"])
    subprocess.check_call(["flask", "--app", "wsgi", "db", "upgrade"])
    row_count = 0

if row_count == 0:
    print("Database empty — syncing data...")
    subprocess.check_call(["flask", "--app", "wsgi", "sync-data"])
    try:
        subprocess.check_call(["flask", "--app", "wsgi", "sync-history"])
    except subprocess.CalledProcessError:
        print("History sync skipped or failed; continuing.")
PY

echo "Starting API server..."
exec flask --app wsgi run --host 0.0.0.0 --port 5000 --debug

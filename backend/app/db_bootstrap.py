"""Ensure the development database schema and seed data exist."""

from __future__ import annotations

import subprocess

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


def _tables_exist(engine: Engine) -> bool:
    with engine.connect() as conn:
        return bool(
            conn.execute(
                text("SELECT to_regclass('public.tournaments') IS NOT NULL")
            ).scalar()
        )


def _tournament_count(engine: Engine) -> int:
    with engine.connect() as conn:
        return conn.execute(text("SELECT COUNT(*) FROM tournaments")).scalar() or 0


def ensure_database_ready(database_url: str) -> None:
    """Rebuild schema and seed data when tables are missing or empty."""
    engine = create_engine(database_url)

    if not _tables_exist(engine):
        print("Schema missing with stale migration state — rebuilding...")
        subprocess.check_call(["flask", "--app", "wsgi", "db", "stamp", "base"])
        subprocess.check_call(["flask", "--app", "wsgi", "db", "upgrade"])

    if _tournament_count(engine) == 0:
        print("Database empty — syncing data...")
        subprocess.check_call(["flask", "--app", "wsgi", "sync-data"])
        try:
            subprocess.check_call(["flask", "--app", "wsgi", "sync-history"])
        except subprocess.CalledProcessError:
            print("History sync skipped or failed; continuing.")

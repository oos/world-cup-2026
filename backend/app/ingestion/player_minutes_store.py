"""Store per-player minutes parsed from score providers."""

from __future__ import annotations

from datetime import datetime, timezone


def apply_player_minutes(
    match,
    minutes1: list | None,
    minutes2: list | None,
    *,
    source: str,
) -> bool:
    if not minutes1 and not minutes2:
        return False

    payload = {
        "source": source,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "team1": list(minutes1 or []),
        "team2": list(minutes2 or []),
    }
    sources = dict(match.data_sources or {})
    if sources.get("player_minutes") == payload:
        return False

    sources["player_minutes"] = payload
    match.data_sources = sources
    return True


def player_minutes_for_match(match) -> tuple[list[dict], list[dict]]:
    sources = match.data_sources or {}
    payload = sources.get("player_minutes") or {}
    return list(payload.get("team1") or []), list(payload.get("team2") or [])

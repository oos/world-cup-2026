"""Merge match scores from multiple sources without downgrading final results."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.ingestion.live_status import merge_live_into_score

# Higher number = higher priority when both sides have final scores.
SOURCE_PRIORITY: dict[str, int] = {
    "known_scores": 100,
    "espn": 80,
    "api_football": 75,
    "openfootball": 50,
}


def _has_ft_score(score: Any) -> bool:
    if not isinstance(score, dict):
        return False
    ft = score.get("ft")
    return isinstance(ft, list) and len(ft) >= 2


def score_source_priority(source: str | None) -> int:
    if not source:
        return 0
    return SOURCE_PRIORITY.get(source, 10)


def merge_score(
    existing: dict | None,
    incoming: dict | None,
    *,
    source: str,
    existing_source: str | None = None,
    force: bool = False,
) -> dict | None:
    """Return merged score dict, or None if incoming should not apply."""
    if not incoming or not _has_ft_score(incoming):
        return existing if existing else None

    if not existing or not _has_ft_score(existing):
        return dict(incoming)

    if force or score_source_priority(source) >= score_source_priority(existing_source):
        merged = dict(existing)
        merged.update(incoming)
        return merged

    return existing


def _normalize_goal_minute(minute: Any) -> int:
    if minute is None:
        return 999
    if isinstance(minute, str):
        cleaned = minute.strip().rstrip("'").split("+", 1)[0]
        try:
            return int(cleaned)
        except ValueError:
            return 999
    try:
        return int(minute)
    except (TypeError, ValueError):
        return 999


def _goal_merge_key(goal: dict) -> tuple:
    return (
        goal.get("name"),
        _normalize_goal_minute(goal.get("minute")),
        goal.get("offset") or 0,
        bool(goal.get("penalty")),
        bool(goal.get("owngoal")),
    )


def merge_goals(existing: list | None, incoming: list | None) -> list:
    if not incoming:
        return list(existing or [])
    if not existing:
        return list(incoming)

    merged: dict[tuple, dict] = {
        _goal_merge_key(goal): goal for goal in existing if isinstance(goal, dict)
    }
    for goal in incoming:
        if not isinstance(goal, dict):
            continue
        key = _goal_merge_key(goal)
        existing_goal = merged.get(key)
        if existing_goal:
            combined = {**existing_goal, **goal}
            if not goal.get("assist") and existing_goal.get("assist"):
                combined["assist"] = existing_goal["assist"]
            merged[key] = combined
        else:
            merged[key] = goal

    return sorted(
        merged.values(),
        key=lambda goal: (
            _normalize_goal_minute(goal.get("minute")),
            goal.get("offset") or 0,
        ),
    )


def stamp_score_provenance(
    data_sources: dict | None,
    *,
    source: str,
    status: str | None = None,
) -> dict:
    sources = dict(data_sources or {})
    sources["score"] = {
        "source": source,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        **({"status": status} if status else {}),
    }
    return sources


def apply_score_update(
    match,
    score: dict | None,
    *,
    source: str,
    goals1: list | None = None,
    goals2: list | None = None,
    status: str | None = None,
    force: bool = False,
) -> bool:
    """Apply score/goals to a Match ORM object. Returns True if score changed."""
    if score is None and goals1 is None and goals2 is None:
        return False

    incoming_live = score.get("live") if isinstance(score, dict) else None
    score_without_live = (
        {key: value for key, value in score.items() if key not in {"live", "final"}}
        if isinstance(score, dict)
        else score
    )

    existing_sources = match.data_sources or {}
    existing_score_meta = existing_sources.get("score") or {}
    existing_source = existing_score_meta.get("source")

    merged_score = merge_score(
        match.score,
        score_without_live,
        source=source,
        existing_source=existing_source,
        force=force,
    )
    changed = False

    if merged_score is not None and merged_score != match.score:
        match.score = merged_score
        changed = True
    elif score_without_live and _has_ft_score(score_without_live) and not _has_ft_score(match.score):
        match.score = score_without_live
        changed = True

    if incoming_live is not None:
        incoming_live = {
            **incoming_live,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        next_score = merge_live_into_score(match.score, incoming_live)
        if next_score != match.score:
            match.score = next_score
            changed = True
    elif status in {"post", "ft"} and isinstance(match.score, dict):
        next_score = dict(match.score)
        if next_score.pop("live", None) is not None or not next_score.get("final"):
            next_score["final"] = True
            match.score = next_score
            changed = True

    if goals1 is not None:
        merged_goals1 = merge_goals(match.goals1, goals1)
        if merged_goals1 != (match.goals1 or []):
            match.goals1 = merged_goals1
            changed = True

    if goals2 is not None:
        merged_goals2 = merge_goals(match.goals2, goals2)
        if merged_goals2 != (match.goals2 or []):
            match.goals2 = merged_goals2
            changed = True

    if changed and score_without_live and _has_ft_score(score_without_live):
        match.data_sources = stamp_score_provenance(
            match.data_sources,
            source=source,
            status=status,
        )

    return changed

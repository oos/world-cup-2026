"""Merge match scores from multiple sources without downgrading final results."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

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


def merge_goals(existing: list | None, incoming: list | None) -> list:
    if incoming:
        return list(incoming)
    return list(existing or [])


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

    existing_sources = match.data_sources or {}
    existing_score_meta = existing_sources.get("score") or {}
    existing_source = existing_score_meta.get("source")

    merged_score = merge_score(
        match.score,
        score,
        source=source,
        existing_source=existing_source,
        force=force,
    )
    changed = False

    if merged_score is not None and merged_score != match.score:
        match.score = merged_score
        changed = True
    elif score and _has_ft_score(score) and not _has_ft_score(match.score):
        match.score = score
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

    if changed and (score and _has_ft_score(score)):
        match.data_sources = stamp_score_provenance(
            match.data_sources,
            source=source,
            status=status,
        )

    return changed

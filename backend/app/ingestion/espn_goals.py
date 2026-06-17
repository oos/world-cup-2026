"""Parse goal scorers from ESPN match summaries."""

from __future__ import annotations

from app.ingestion.live_status import _parse_clock_display
from app.ingestion.team_mapper import name_to_fifa
from app.models.match import Match


def _team_side(team_name: str | None, match: Match) -> str | None:
    if not team_name or not match.team1 or not match.team2:
        return None
    code = (name_to_fifa(team_name) or team_name).strip().lower()
    team1_code = (name_to_fifa(match.team1.name) or match.team1.name).strip().lower()
    team2_code = (name_to_fifa(match.team2.name) or match.team2.name).strip().lower()
    if code == team1_code:
        return "team1"
    if code == team2_code:
        return "team2"
    return None


def parse_espn_summary_goals(summary: dict, match: Match) -> tuple[list[dict], list[dict]]:
    goals1: list[dict] = []
    goals2: list[dict] = []

    for event in summary.get("keyEvents") or []:
        if not event.get("scoringPlay"):
            continue
        type_text = ((event.get("type") or {}).get("text") or "").lower()
        if "goal" not in type_text:
            continue

        participants = event.get("participants") or []
        scorer = None
        if participants:
            scorer = ((participants[0].get("athlete") or {}).get("displayName") or "").strip()
        if not scorer:
            continue

        team_name = (event.get("team") or {}).get("displayName")
        side = _team_side(team_name, match)
        if side is None:
            continue

        clock = event.get("clock") or {}
        display = clock.get("displayValue")
        minute, added = _parse_clock_display(display)
        payload: dict = {"name": scorer, "minute": minute}
        if added:
            payload["offset"] = added
        if "own goal" in type_text:
            payload["owngoal"] = True

        if side == "team1":
            goals1.append(payload)
        else:
            goals2.append(payload)

    def sort_goals(items: list[dict]) -> list[dict]:
        return sorted(
            items,
            key=lambda goal: (
                goal.get("minute") if goal.get("minute") is not None else 999,
                goal.get("offset") or 0,
            ),
        )

    return sort_goals(goals1), sort_goals(goals2)

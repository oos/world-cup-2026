"""Enrich World Cup match goals from the Fjelstul World Cup Database."""

from __future__ import annotations

import json
from pathlib import Path

import httpx

from app.ingestion.team_mapper import name_to_fifa

FJELSTUL_WORLD_CUP_URL = (
    "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-json/worldcup.json"
)
DEFAULT_GOALS_CACHE = (
    Path(__file__).resolve().parents[2] / "data" / "fjelstul_goals.json"
)

# Map openfootball / app team labels to Fjelstul team names.
TEAM_ALIASES: dict[str, str] = {
    "usa": "United States",
    "korea republic": "South Korea",
    "côte d'ivoire": "Ivory Coast",
    "cote d'ivoire": "Ivory Coast",
    "ireland": "Republic of Ireland",
    "ir iran": "Iran",
    "türkiye": "Turkey",
    "turkiye": "Turkey",
    "czechia": "Czech Republic",
    "fr germany": "West Germany",
    "bosnia-herzegovina": "Bosnia and Herzegovina",
    "bosnia & herzegovina": "Bosnia and Herzegovina",
    "congo dr": "DR Congo",
    "democratic republic of the congo": "DR Congo",
    "curacao": "Curaçao",
}


def _team_key(name: str) -> str:
    raw = (name or "").strip()
    lowered = raw.lower()
    canonical = TEAM_ALIASES.get(lowered, raw)
    return (name_to_fifa(canonical) or canonical).strip().lower()


def _match_pair_key(date: str | None, team1: str, team2: str) -> tuple[str, str, str] | None:
    if not date or not team1 or not team2:
        return None
    teams = sorted([_team_key(team1), _team_key(team2)])
    return (date, teams[0], teams[1])


_PLACEHOLDER_NAME_PARTS = frozenset(
    {"", "n/a", "na", "none", "-", "unknown", "not applicable"}
)


def _clean_name_part(value: str | None) -> str:
    cleaned = (value or "").strip()
    if cleaned.lower() in _PLACEHOLDER_NAME_PARTS:
        return ""
    return cleaned


def _player_name(goal: dict) -> str:
    given = _clean_name_part(goal.get("given_name"))
    family = _clean_name_part(goal.get("family_name"))
    if given and family:
        return f"{given} {family}"
    return given or family or "Unknown"


def _goal_payload(goal: dict) -> dict:
    payload: dict = {
        "name": _player_name(goal),
        "minute": goal.get("minute_regulation"),
    }
    if goal.get("minute_stoppage"):
        payload["offset"] = goal["minute_stoppage"]
    if goal.get("penalty"):
        payload["penalty"] = True
    if goal.get("own_goal"):
        payload["owngoal"] = True
    return payload


class GoalEnrichmentService:
    def __init__(self, cache_path: Path | None = None) -> None:
        self.cache_path = cache_path or DEFAULT_GOALS_CACHE
        self._lookup: dict[tuple[str, str, str], dict[str, list[dict]]] | None = None

    def sync_goals(self) -> dict:
        with httpx.Client(timeout=120.0) as client:
            response = client.get(FJELSTUL_WORLD_CUP_URL)
            response.raise_for_status()
            goals = response.json().get("goals", [])

        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache_path.write_text(json.dumps(goals, separators=(",", ":")))
        self._lookup = None
        return {"goals": len(goals), "cache_path": str(self.cache_path)}

    def _load_goals(self) -> list[dict]:
        if self.cache_path.exists():
            return json.loads(self.cache_path.read_text())

        self.sync_goals()
        return json.loads(self.cache_path.read_text())

    def _build_lookup(self) -> dict[tuple[str, str, str], dict[str, list[dict]]]:
        lookup: dict[tuple[str, str, str], dict[str, list[dict]]] = {}
        goals = self._load_goals()

        for goal in goals:
            match_name = goal.get("match_name") or ""
            if " vs " not in match_name:
                continue

            home_name, away_name = [part.strip() for part in match_name.split(" vs ", 1)]
            key = _match_pair_key(goal.get("match_date"), home_name, away_name)
            if not key:
                continue

            bucket = lookup.setdefault(key, {})
            scoring_team = goal.get("player_team_name") or goal.get("team_name") or ""
            team_key = _team_key(scoring_team)
            bucket.setdefault(team_key, []).append(_goal_payload(goal))

        return lookup

    def _lookup_table(self) -> dict[tuple[str, str, str], dict[str, list[dict]]]:
        if self._lookup is None:
            self._lookup = self._build_lookup()
        return self._lookup

    def goals_for_match(
        self, date: str | None, team1: str, team2: str
    ) -> tuple[list[dict], list[dict]] | None:
        key = _match_pair_key(date, team1, team2)
        if not key:
            return None

        bucket = self._lookup_table().get(key)
        if not bucket:
            return None

        team1_key = _team_key(team1)
        team2_key = _team_key(team2)
        goals1 = list(bucket.get(team1_key, []))
        goals2 = list(bucket.get(team2_key, []))

        def sort_goal(item: dict) -> tuple[int, int]:
            minute = item.get("minute")
            offset = item.get("offset") or 0
            return (minute if minute is not None else 999, offset)

        goals1.sort(key=sort_goal)
        goals2.sort(key=sort_goal)
        return goals1, goals2


_goal_service: GoalEnrichmentService | None = None


def _service() -> GoalEnrichmentService:
    global _goal_service
    if _goal_service is None:
        _goal_service = GoalEnrichmentService()
    return _goal_service


def reset_goal_enrichment_service(cache_path: Path | None = None) -> None:
    global _goal_service
    _goal_service = GoalEnrichmentService(cache_path=cache_path) if cache_path else None


def enrich_match_goals(match: dict) -> dict:
    goals = _service().goals_for_match(
        match.get("date"),
        match.get("team1", ""),
        match.get("team2", ""),
    )
    if not goals:
        return match

    goals1, goals2 = goals
    enriched = {**match, "goals1": goals1, "goals2": goals2}
    return enriched

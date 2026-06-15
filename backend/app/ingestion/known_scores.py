"""Authoritative scores for matches not yet in openfootball."""

from __future__ import annotations

from app.ingestion.team_mapper import name_to_fifa

KNOWN_MATCH_SCORES: list[dict] = [
    {
        "date": "2026-06-11",
        "team1": "Mexico",
        "team2": "South Africa",
        "round": "Matchday 1",
        "score": {"ft": [2, 0], "ht": [1, 0]},
        "goals1": [
            {"name": "Julián Quiñones", "minute": 9},
            {"name": "Raúl Jiménez", "minute": 67},
        ],
        "goals2": [],
    },
    {
        "date": "2026-06-11",
        "team1": "South Korea",
        "team2": "Czech Republic",
        "round": "Matchday 1",
        "score": {"ft": [2, 1], "ht": [0, 0]},
        "goals1": [
            {"name": "Hwang In-beom", "minute": 67},
            {"name": "Oh Hyeon-gyu", "minute": 80},
        ],
        "goals2": [
            {"name": "Ladislav Krejčí", "minute": 59},
        ],
    },
    {
        "date": "2026-06-12",
        "team1": "Canada",
        "team2": "Bosnia and Herzegovina",
        "round": "Matchday 2",
        "score": {"ft": [1, 1], "ht": [0, 1]},
        "goals1": [
            {"name": "Cyle Larin", "minute": 78},
        ],
        "goals2": [
            {"name": "Miralem Lukić", "minute": 21},
        ],
    },
]


def _team_key(name: str) -> str:
    return (name_to_fifa(name) or name).strip().lower()


def _pair_key(date: str | None, team1: str, team2: str) -> tuple[str, str, str] | None:
    if not date or not team1 or not team2:
        return None
    teams = sorted([_team_key(team1), _team_key(team2)])
    return (date, teams[0], teams[1])


def _build_lookup() -> dict[tuple[str, str, str], dict]:
    lookup: dict[tuple[str, str, str], dict] = {}
    for entry in KNOWN_MATCH_SCORES:
        key = _pair_key(entry["date"], entry["team1"], entry["team2"])
        if key:
            lookup[key] = entry
    return lookup


_LOOKUP = _build_lookup()


def find_known_score(date: str | None, team1: str, team2: str) -> dict | None:
    key = _pair_key(date, team1, team2)
    if not key:
        return None
    return _LOOKUP.get(key)


def apply_known_score(match: dict) -> dict:
    known = find_known_score(match.get("date"), match.get("team1", ""), match.get("team2", ""))
    if not known:
        return match

    enriched = {**match}
    if known.get("score"):
        enriched["score"] = known["score"]
    if known.get("goals1") is not None:
        enriched["goals1"] = known["goals1"]
    if known.get("goals2") is not None:
        enriched["goals2"] = known["goals2"]
    return enriched


def known_score_for_teams(
    match_date: str | None,
    team1_name: str,
    team2_name: str,
) -> dict | None:
    known = find_known_score(match_date, team1_name, team2_name)
    if not known:
        return None
    return known.get("score")


def known_goals_for_teams(
    match_date: str | None,
    team1_name: str,
    team2_name: str,
) -> tuple[list[dict] | None, list[dict] | None]:
    known = find_known_score(match_date, team1_name, team2_name)
    if not known:
        return None, None
    goals1 = known.get("goals1")
    goals2 = known.get("goals2")
    return (
        list(goals1) if goals1 is not None else None,
        list(goals2) if goals2 is not None else None,
    )

from datetime import date

from app.models.match import Match


def match_identity_key(match: Match) -> tuple:
    team_ids = sorted([match.team1_id or 0, match.team2_id or 0])
    return (
        match.tournament_id,
        match.match_date,
        match.match_time,
        match.round,
        match.group_name,
        team_ids[0],
        team_ids[1],
    )


def _has_final_score(match: Match) -> bool:
    if not isinstance(match.score, dict):
        return False
    ft = match.score.get("ft")
    return isinstance(ft, list) and len(ft) >= 2


def _match_rank(match: Match) -> tuple:
    has_ft = 1 if _has_final_score(match) else 0
    stadium_score = 1 if match.stadium_id else 0
    match_key_score = 1 if match.match_key else 0
    return (has_ft, stadium_score, match_key_score, -match.id)


def pick_preferred_match(current: Match, candidate: Match) -> Match:
    return candidate if _match_rank(candidate) > _match_rank(current) else current


def dedupe_matches(matches: list[Match]) -> list[Match]:
    best: dict[tuple, Match] = {}
    for match in matches:
        key = match_identity_key(match)
        existing = best.get(key)
        best[key] = pick_preferred_match(existing, match) if existing else match

    return sorted(
        best.values(),
        key=lambda match: (
            match.match_date or date.min,
            match.match_number or 0,
            match.id,
        ),
    )

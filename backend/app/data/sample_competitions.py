"""Structural sample data for competitions without a free real-data source.

openfootball covers domestic leagues well, but domestic cups and the current
UEFA league-phase format have limited free coverage. These representative
2024-25 datasets let every format template render end-to-end; they can be
replaced by real ingestion (e.g. a paid API-Football path) later.

Each entry provides a `teams` list (club names) and `matches` with a `stage`,
`round`, optional `leg`, date and score.
"""

from __future__ import annotations


def _knockout(quarter, semi, final):
    matches = []
    for t1, t2, s in quarter:
        matches.append(
            {"stage": "quarter_final", "round": "Quarter-finals", "team1": t1, "team2": t2, "score": {"ft": s}}
        )
    for t1, t2, s in semi:
        matches.append(
            {"stage": "semi_final", "round": "Semi-finals", "team1": t1, "team2": t2, "score": {"ft": s}}
        )
    for t1, t2, s in final:
        matches.append(
            {"stage": "final", "round": "Final", "team1": t1, "team2": t2, "score": {"ft": s}}
        )
    return matches


FA_CUP = {
    "teams": [
        "Crystal Palace", "Manchester City", "Aston Villa", "Nottingham Forest",
        "Fulham", "Brighton", "Preston North End", "Bournemouth",
    ],
    "matches": _knockout(
        quarter=[
            ("Crystal Palace", "Fulham", [3, 0]),
            ("Aston Villa", "Preston North End", [3, 0]),
            ("Manchester City", "Bournemouth", [2, 1]),
            ("Nottingham Forest", "Brighton", [2, 0]),
        ],
        semi=[
            ("Crystal Palace", "Aston Villa", [3, 0]),
            ("Manchester City", "Nottingham Forest", [2, 0]),
        ],
        final=[("Crystal Palace", "Manchester City", [1, 0])],
    ),
}

EFL_CUP = {
    "teams": [
        "Newcastle United", "Liverpool", "Arsenal", "Tottenham Hotspur",
        "Chelsea", "Southampton", "Crystal Palace", "Brentford",
    ],
    "matches": _knockout(
        quarter=[
            ("Newcastle United", "Brentford", [3, 1]),
            ("Arsenal", "Crystal Palace", [3, 2]),
            ("Liverpool", "Southampton", [2, 1]),
            ("Tottenham Hotspur", "Chelsea", [4, 3]),
        ],
        semi=[
            ("Newcastle United", "Arsenal", [4, 0]),
            ("Liverpool", "Tottenham Hotspur", [4, 1]),
        ],
        final=[("Newcastle United", "Liverpool", [2, 1])],
    ),
}

COPA_DEL_REY = {
    "teams": [
        "Barcelona", "Real Madrid", "Atletico Madrid", "Real Sociedad",
        "Athletic Bilbao", "Getafe", "Leganes", "Osasuna",
    ],
    "matches": _knockout(
        quarter=[
            ("Barcelona", "Getafe", [5, 0]),
            ("Atletico Madrid", "Leganes", [2, 0]),
            ("Real Madrid", "Osasuna", [3, 0]),
            ("Real Sociedad", "Athletic Bilbao", [1, 0]),
        ],
        semi=[
            ("Barcelona", "Atletico Madrid", [5, 4]),
            ("Real Madrid", "Real Sociedad", [5, 4]),
        ],
        final=[("Barcelona", "Real Madrid", [3, 2])],
    ),
}


def _league_phase(rows):
    """rows: list of (team1, team2, [g1, g2])."""
    return [
        {"stage": "league_phase", "round": "League phase", "team1": t1, "team2": t2, "score": {"ft": s}}
        for t1, t2, s in rows
    ]


def _two_legged(stage, label, ties):
    """ties: list of (teamA, teamB, [legA1,legB1], [legA2,legB2])."""
    matches = []
    for a, b, leg1, leg2 in ties:
        matches.append(
            {"stage": stage, "round": label, "leg": 1, "team1": a, "team2": b, "score": {"ft": leg1}}
        )
        matches.append(
            {"stage": stage, "round": label, "leg": 2, "team1": b, "team2": a, "score": {"ft": leg2}}
        )
    return matches


UEFA_CHAMPIONS_LEAGUE = {
    "teams": [
        "Paris Saint-Germain", "Inter Milan", "Barcelona", "Arsenal",
        "Real Madrid", "Bayern Munich", "Aston Villa", "Borussia Dortmund",
        "Liverpool", "Lille", "Atletico Madrid", "Benfica",
    ],
    "matches": (
        _league_phase([
            ("Liverpool", "Real Madrid", [2, 0]),
            ("Barcelona", "Bayern Munich", [4, 1]),
            ("Paris Saint-Germain", "Atletico Madrid", [2, 1]),
            ("Inter Milan", "Arsenal", [1, 0]),
            ("Aston Villa", "Bayern Munich", [1, 0]),
            ("Lille", "Real Madrid", [1, 0]),
            ("Borussia Dortmund", "Barcelona", [2, 3]),
            ("Benfica", "Atletico Madrid", [4, 0]),
            ("Arsenal", "Paris Saint-Germain", [2, 0]),
            ("Real Madrid", "Borussia Dortmund", [5, 2]),
        ])
        + _two_legged("knockout_playoff", "Knockout play-offs", [
            ("Real Madrid", "Manchester City", [3, 2], [3, 1]),
            ("Bayern Munich", "Celtic", [1, 1], [1, 1]),
        ])
        + _two_legged("quarter_final", "Quarter-finals", [
            ("Arsenal", "Real Madrid", [3, 0], [2, 1]),
            ("Paris Saint-Germain", "Aston Villa", [3, 1], [2, 3]),
            ("Inter Milan", "Bayern Munich", [2, 1], [2, 2]),
            ("Barcelona", "Borussia Dortmund", [4, 0], [1, 3]),
        ])
        + _two_legged("semi_final", "Semi-finals", [
            ("Paris Saint-Germain", "Arsenal", [1, 0], [2, 1]),
            ("Inter Milan", "Barcelona", [3, 3], [4, 3]),
        ])
        + [{"stage": "final", "round": "Final", "team1": "Paris Saint-Germain", "team2": "Inter Milan", "score": {"ft": [5, 0]}}]
    ),
}

UEFA_EUROPA_LEAGUE = {
    "teams": [
        "Tottenham Hotspur", "Manchester United", "Athletic Bilbao", "Lyon",
        "Rangers", "Lazio", "Eintracht Frankfurt", "Roma",
    ],
    "matches": (
        _league_phase([
            ("Lazio", "Manchester United", [0, 0]),
            ("Tottenham Hotspur", "Roma", [2, 2]),
            ("Athletic Bilbao", "Rangers", [0, 0]),
            ("Eintracht Frankfurt", "Lyon", [3, 3]),
            ("Manchester United", "Tottenham Hotspur", [3, 2]),
            ("Lyon", "Lazio", [2, 2]),
        ])
        + _two_legged("semi_final", "Semi-finals", [
            ("Tottenham Hotspur", "Bodo/Glimt", [3, 1], [2, 0]),
            ("Manchester United", "Athletic Bilbao", [3, 0], [4, 1]),
        ])
        + [{"stage": "final", "round": "Final", "team1": "Tottenham Hotspur", "team2": "Manchester United", "score": {"ft": [1, 0]}}]
    ),
}

UEFA_CONFERENCE_LEAGUE = {
    "teams": [
        "Chelsea", "Real Betis", "Fiorentina", "Djurgarden",
        "Jagiellonia", "Legia Warsaw", "Rapid Vienna", "Gent",
    ],
    "matches": (
        _league_phase([
            ("Chelsea", "Gent", [4, 2]),
            ("Real Betis", "Legia Warsaw", [1, 0]),
            ("Fiorentina", "Rapid Vienna", [3, 0]),
            ("Djurgarden", "Jagiellonia", [2, 1]),
        ])
        + _two_legged("semi_final", "Semi-finals", [
            ("Chelsea", "Djurgarden", [4, 1], [1, 0]),
            ("Real Betis", "Fiorentina", [2, 1], [2, 2]),
        ])
        + [{"stage": "final", "round": "Final", "team1": "Real Betis", "team2": "Chelsea", "score": {"ft": [1, 4]}}]
    ),
}


SAMPLE_COMPETITIONS: dict[str, dict] = {
    "fa-cup": FA_CUP,
    "efl-cup": EFL_CUP,
    "copa-del-rey": COPA_DEL_REY,
    "uefa-champions-league": UEFA_CHAMPIONS_LEAGUE,
    "uefa-europa-league": UEFA_EUROPA_LEAGUE,
    "uefa-conference-league": UEFA_CONFERENCE_LEAGUE,
}


def get_sample_competition(key: str) -> dict | None:
    return SAMPLE_COMPETITIONS.get(key)

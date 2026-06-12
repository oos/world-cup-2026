from __future__ import annotations

ABSENCE_REASON_LABELS: dict[str, str] = {
    "did_not_qualify": "Did not qualify",
    "did_not_enter": "Did not enter",
    "withdrew": "Withdrew",
    "boycotted": "Boycotted",
    "banned": "Suspended by FIFA",
    "not_established": "Not yet independent",
    "tournament_cancelled": "World Cup cancelled",
}

# First year the modern nation (or FIFA member) could have entered a World Cup.
NATION_INDEPENDENCE_YEAR: dict[str, int] = {
    "BIH": 1992,
    "CPV": 1975,
    "CRO": 1991,
    "CUW": 2011,
    "COD": 1963,
    "QAT": 1971,
    "RSA": 1992,
    "UZB": 1992,
}

# Curated absence reasons for notable cases. All other absences default to did_not_qualify.
TEAM_ABSENCE_OVERRIDES: dict[str, dict[int, dict[str, str]]] = {
    "ARG": {
        1938: {
            "reason": "boycotted",
            "detail": "Withdrew in protest at the World Cup being held in Europe for a second consecutive time.",
        },
        1950: {
            "reason": "withdrew",
            "detail": "Withdrew amid a South American boycott of the tournament in Brazil.",
        },
        1954: {
            "reason": "withdrew",
            "detail": "Withdrew for political reasons and did not send a squad to Switzerland.",
        },
        1970: {
            "reason": "did_not_qualify",
            "detail": "Failed to qualify after finishing behind Peru and Bolivia in the South American group.",
        },
    },
    "ENG": {
        1930: {
            "reason": "did_not_enter",
            "detail": "The Football Association declined to enter the inaugural World Cup.",
        },
        1934: {
            "reason": "did_not_enter",
            "detail": "The Football Association declined to participate.",
        },
        1938: {
            "reason": "did_not_enter",
            "detail": "The Football Association declined to participate.",
        },
    },
    "GER": {
        1930: {
            "reason": "did_not_enter",
            "detail": "Germany did not enter the inaugural World Cup.",
        },
        1950: {
            "reason": "banned",
            "detail": "West Germany were not yet reinstated by FIFA in time for the 1950 World Cup.",
        },
    },
    "URU": {
        1934: {
            "reason": "boycotted",
            "detail": "Boycotted in protest at the World Cup being held in Europe for a second consecutive time.",
        },
        1938: {
            "reason": "boycotted",
            "detail": "Boycotted alongside several South American nations.",
        },
    },
    "IND": {
        1950: {
            "reason": "withdrew",
            "detail": "Withdrew after qualifying, reportedly over travel costs and squad selection rules.",
        },
    },
    "TUR": {
        1930: {
            "reason": "withdrew",
            "detail": "Withdrew before the tournament began.",
        },
    },
    "PER": {
        1930: {
            "reason": "withdrew",
            "detail": "Withdrew before the tournament began.",
        },
    },
    "CHI": {
        1934: {
            "reason": "withdrew",
            "detail": "Withdrew before the tournament began.",
        },
    },
    "AUS": {
        1950: {
            "reason": "withdrew",
            "detail": "Withdrew before the tournament began.",
        },
    },
    "FRA": {
        1930: {
            "reason": "did_not_enter",
            "detail": "France did not enter the inaugural World Cup.",
        },
    },
    "RSA": {
        1966: {
            "reason": "banned",
            "detail": "Excluded from FIFA due to apartheid policies.",
        },
        1970: {
            "reason": "banned",
            "detail": "Excluded from FIFA due to apartheid policies.",
        },
        1974: {
            "reason": "banned",
            "detail": "Excluded from FIFA due to apartheid policies.",
        },
        1978: {
            "reason": "banned",
            "detail": "Excluded from FIFA due to apartheid policies.",
        },
        1982: {
            "reason": "banned",
            "detail": "Excluded from FIFA due to apartheid policies.",
        },
        1986: {
            "reason": "banned",
            "detail": "Excluded from FIFA due to apartheid policies.",
        },
    },
}


def get_absence_reason(fifa_code: str, year: int) -> dict[str, str | None]:
    overrides = TEAM_ABSENCE_OVERRIDES.get(fifa_code, {})
    if year in overrides:
        entry = overrides[year]
        reason = entry["reason"]
        detail = entry.get("detail")
    else:
        independence_year = NATION_INDEPENDENCE_YEAR.get(fifa_code)
        if independence_year and year < independence_year:
            reason = "not_established"
            detail = None
        else:
            reason = "did_not_qualify"
            detail = None

    return {
        "absence_reason": reason,
        "absence_label": ABSENCE_REASON_LABELS[reason],
        "absence_detail": detail,
    }

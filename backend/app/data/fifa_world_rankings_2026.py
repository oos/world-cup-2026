"""FIFA/Coca-Cola Men's World Ranking as of 11 June 2026 (pre-World Cup)."""

from __future__ import annotations

# Source: FIFA rankings published ahead of the 2026 World Cup kickoff.
FIFA_WORLD_RANKINGS_2026: dict[str, int] = {
    "ARG": 1,
    "ESP": 2,
    "FRA": 3,
    "ENG": 4,
    "POR": 5,
    "BRA": 6,
    "MAR": 7,
    "NED": 8,
    "BEL": 9,
    "GER": 10,
    "CRO": 11,
    "COL": 13,
    "MEX": 14,
    "SEN": 15,
    "URU": 16,
    "USA": 17,
    "JPN": 18,
    "SUI": 19,
    "IRN": 20,
    "DEN": 21,
    "TUR": 22,
    "ECU": 23,
    "AUT": 24,
    "KOR": 25,
    "NGA": 26,
    "AUS": 27,
    "ALG": 28,
    "EGY": 29,
    "CAN": 30,
    "NOR": 31,
    "CIV": 33,
    "PAN": 34,
    "SWE": 38,
    "CZE": 40,
    "PAR": 41,
    "SCO": 42,
    "TUN": 45,
    "COD": 46,
    "UZB": 50,
    "QAT": 56,
    "IRQ": 57,
    "RSA": 60,
    "KSA": 61,
    "JOR": 63,
    "BIH": 64,
    "CPV": 67,
    "GHA": 73,
    "CUW": 82,
    "HAI": 83,
    "NZL": 85,
}


def get_world_ranking_2026(fifa_code: str | None) -> int | None:
    if not fifa_code:
        return None
    return FIFA_WORLD_RANKINGS_2026.get(fifa_code.upper())

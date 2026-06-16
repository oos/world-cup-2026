"""FIFA/Coca-Cola Men's World Ranking as of 11 June 2026 (pre-World Cup)."""

from __future__ import annotations

from app.data.nation_registry import NATION_SEED

# Source: FIFA rankings published ahead of the 2026 World Cup kickoff.
# World Cup squad ranks are preserved from the published table; other ranked nations fill gaps.
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
    "ITA": 12,
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
    "UKR": 32,
    "CIV": 33,
    "PAN": 34,
    "POL": 35,
    "WAL": 36,
    "SRB": 37,
    "SWE": 38,
    "ROU": 39,
    "CZE": 40,
    "PAR": 41,
    "SCO": 42,
    "SVK": 43,
    "SVN": 44,
    "TUN": 45,
    "COD": 46,
    "CHI": 47,
    "PER": 48,
    "IRL": 49,
    "UZB": 50,
    "GRE": 51,
    "HUN": 52,
    "CMR": 53,
    "CRC": 54,
    "JAM": 55,
    "QAT": 56,
    "IRQ": 57,
    "ISR": 58,
    "UAE": 59,
    "RSA": 60,
    "KSA": 61,
    "ISL": 62,
    "JOR": 63,
    "BIH": 64,
    "BUL": 65,
    "CUB": 66,
    "CPV": 67,
    "CHN": 68,
    "HON": 69,
    "RUS": 70,
    "NIR": 71,
    "ANG": 72,
    "GHA": 73,
    "BOL": 74,
    "KUW": 75,
    "TRI": 76,
    "TGO": 77,
    "ELS": 78,
    "PRK": 79,
    "CUW": 82,
    "HAI": 83,
    "NZL": 85,
}

FIFA_WORLD_RANKING_ORDER_2026: list[tuple[int, str]] = sorted(
    (rank, code) for code, rank in FIFA_WORLD_RANKINGS_2026.items()
)

_NATION_BY_CODE: dict[str, tuple[str, str, str]] = {
    code: (name, flag_iso, continent) for name, code, flag_iso, continent, _ in NATION_SEED
}

_CONTINENT_CONFEDERATION = {
    "Europe": "UEFA",
    "Africa": "CAF",
    "Asia": "AFC",
    "North America": "CONCACAF",
    "South America": "CONMEBOL",
    "Oceania": "OFC",
}

RANKINGS_AS_OF = "2026-06-11"


def get_world_ranking_2026(fifa_code: str | None) -> int | None:
    if not fifa_code:
        return None
    return FIFA_WORLD_RANKINGS_2026.get(fifa_code.upper())


def list_world_rankings_2026() -> list[dict]:
    entries: list[dict] = []
    for rank, code in FIFA_WORLD_RANKING_ORDER_2026:
        nation = _NATION_BY_CODE.get(code)
        if not nation:
            continue
        name, flag_iso, continent = nation
        entries.append(
            {
                "rank": rank,
                "fifa_code": code,
                "name": name,
                "flag_iso": flag_iso,
                "confederation": _CONTINENT_CONFEDERATION.get(continent, continent),
            }
        )
    return entries

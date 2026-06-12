import re
from dataclasses import dataclass


@dataclass(frozen=True)
class HonourCategory:
    key: str
    label: str
    tier: str  # major | domestic | cup | continental | club | individual | other


HONOUR_CATEGORIES: tuple[HonourCategory, ...] = (
    HonourCategory("world_cup", "World Cup", "major"),
    HonourCategory("champions_league", "Champions League", "major"),
    HonourCategory("euro", "European Championship", "major"),
    HonourCategory("copa_america", "Copa América", "major"),
    HonourCategory("afcon", "Africa Cup of Nations", "major"),
    HonourCategory("gold_cup", "Gold Cup", "major"),
    HonourCategory("club_world_cup", "Club World Cup", "club"),
    HonourCategory("premier_league", "Premier League", "domestic"),
    HonourCategory("la_liga", "La Liga", "domestic"),
    HonourCategory("serie_a", "Serie A", "domestic"),
    HonourCategory("bundesliga", "Bundesliga", "domestic"),
    HonourCategory("ligue_1", "Ligue 1", "domestic"),
    HonourCategory("eredivisie", "Eredivisie", "domestic"),
    HonourCategory("primeira_liga", "Primeira Liga", "domestic"),
    HonourCategory("mls", "MLS", "domestic"),
    HonourCategory("fa_cup", "FA Cup", "cup"),
    HonourCategory("copa_del_rey", "Copa del Rey", "cup"),
    HonourCategory("coppa_italia", "Coppa Italia", "cup"),
    HonourCategory("dfb_pokal", "DFB-Pokal", "cup"),
    HonourCategory("coupe_de_france", "Coupe de France", "cup"),
    HonourCategory("league_cup", "League Cup", "cup"),
    HonourCategory("super_cup", "Super Cup", "cup"),
    HonourCategory("europa_league", "Europa League", "continental"),
    HonourCategory("conference_league", "Conference League", "continental"),
    HonourCategory("ballon_dor", "Ballon d'Or", "individual"),
)

_CATEGORY_BY_KEY = {category.key: category for category in HONOUR_CATEGORIES}

_COMPETITION_PATTERNS: tuple[tuple[str, str], ...] = (
    ("world_cup", r"\bfifa world cup\b"),
    ("champions_league", r"\buefa champions league\b|\beuropean cup\b"),
    ("euro", r"\buefa european championship\b|\beuropean championship\b|\buefa euro\b"),
    ("copa_america", r"\bcopa américa\b|\bcopa america\b"),
    ("afcon", r"\bafrica cup of nations\b"),
    ("gold_cup", r"\bconcacaf gold cup\b|\bgold cup\b"),
    ("club_world_cup", r"\bfifa club world cup\b"),
    ("premier_league", r"\bpremier league\b"),
    ("la_liga", r"\bla liga\b"),
    ("serie_a", r"\bserie a\b"),
    ("bundesliga", r"\bbundesliga\b"),
    ("ligue_1", r"\bligue 1\b"),
    ("eredivisie", r"\beredivisie\b"),
    ("primeira_liga", r"\bprimeira liga\b"),
    ("mls", r"\bmls cup\b|\bmajor league soccer\b"),
    ("fa_cup", r"\bfa cup\b"),
    ("copa_del_rey", r"\bcopa del rey\b"),
    ("coppa_italia", r"\bcoppa italia\b"),
    ("dfb_pokal", r"\bdfb-pokal\b"),
    ("coupe_de_france", r"\bcoupe de france\b"),
    ("league_cup", r"\befl cup\b|\bleague cup\b|\bcarabao cup\b"),
    ("super_cup", r"\bsuper cup\b|\bsupercopa\b|\btrophée des champions\b"),
    ("europa_league", r"\buefa europa league\b"),
    ("conference_league", r"\buefa conference league\b"),
    ("ballon_dor", r"\bballon d'or\b"),
)

_SKIP_SECTIONS = {
    "decorations",
    "orders",
    "see also",
    "references",
    "notes",
    "cite error",
}

_SKIP_COMPETITIONS = re.compile(
    r"\b(golden ball|golden boot|player of the|top scorer|best player|award|medal|list of)\b",
    re.IGNORECASE,
)


def normalize_competition_name(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip()


def categorize_competition(competition: str) -> HonourCategory | None:
    normalized = normalize_competition_name(competition).lower()
    if _SKIP_COMPETITIONS.search(normalized):
        return None
    if "youth" in normalized or "u-20" in normalized or "u-23" in normalized:
        return None
    if "world cup" in normalized and "fifa world cup" not in normalized:
        return None

    for key, pattern in _COMPETITION_PATTERNS:
        if re.search(pattern, normalized):
            return _CATEGORY_BY_KEY[key]
    return None


def major_honours_from_data_sources(data_sources: dict | None) -> list[dict]:
    cached = (data_sources or {}).get("honours_cache") or {}
    return cached.get("major") or []


def build_honours_payload(entries: list[dict]) -> dict:
    grouped: dict[str, dict] = {}
    for entry in entries:
        category = entry.get("category")
        if not category:
            continue
        bucket = grouped.setdefault(
            category,
            {
                "key": category,
                "label": entry["category_label"],
                "tier": entry["tier"],
                "count": 0,
                "items": [],
            },
        )
        bucket["count"] += len(entry.get("seasons") or [])
        bucket["items"].append(
            {
                "competition": entry["competition"],
                "team": entry.get("team"),
                "seasons": entry.get("seasons") or [],
            }
        )

    major = [
        {"key": item["key"], "label": item["label"], "count": item["count"]}
        for item in grouped.values()
        if item["tier"] == "major" and item["count"] > 0
    ]
    major.sort(key=lambda item: (-item["count"], item["label"]))

    detailed = {
        tier: [
            grouped[key]
            for key in sorted(grouped)
            if grouped[key]["tier"] == tier and grouped[key]["count"] > 0
        ]
        for tier in ("domestic", "cup", "continental", "club", "individual", "other")
    }

    return {
        "major": major,
        "domestic": detailed["domestic"],
        "cups": detailed["cup"],
        "continental": detailed["continental"],
        "club": detailed["club"],
        "individual": detailed["individual"],
        "other": detailed["other"],
        "entries": entries,
    }

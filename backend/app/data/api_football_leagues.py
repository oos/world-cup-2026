"""API-Football league IDs and competition metadata for backfill.

Single source of truth for league_id values. Referenced by competitions.py.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.data.competitions import CompetitionDef

_LEAGUE = "league"
_KNOCKOUT = "knockout"
_GROUPS_KNOCKOUT = "groups_knockout"
_LEAGUE_PHASE_KNOCKOUT = "league_phase_knockout"

_LEAGUE_ZONES = [
    {"from": 1, "to": 1, "kind": "champion", "label": "Champion"},
    {"from": 2, "to": 4, "kind": "qualify", "label": "Champions League"},
    {"from": 5, "to": 6, "kind": "secondary", "label": "Europa League"},
    {"from": 18, "to": 20, "kind": "out", "label": "Relegation"},
]


@dataclass
class ApiFootballLeagueEntry:
    slug: str
    name: str
    league_id: int
    kind: str
    format: str
    season_label: str = "2023-24"
    year: int = 2024
    country: str | None = None
    confederation: str | None = None
    tier: int | None = None
    sort_order: int = 100
    squad_scope: str = "league"  # league | league_teams | all_teams
    pilot: bool = False
    layout_overrides: dict = field(default_factory=dict)


def _def(entry: ApiFootballLeagueEntry) -> CompetitionDef:
    return CompetitionDef(
        slug=entry.slug,
        name=entry.name,
        year=entry.year,
        kind=entry.kind,
        format=entry.format,
        season_label=entry.season_label,
        country=entry.country,
        confederation=entry.confederation,
        tier=entry.tier,
        sort_order=entry.sort_order,
        source={
            "type": "api_football",
            "league_id": entry.league_id,
            "season": entry.year,
            "squad_scope": entry.squad_scope,
            "pilot": entry.pilot,
        },
        layout_overrides=entry.layout_overrides,
    )


# All major competitions for API-Football backfill (season 2024 / 2023-24 on free tier).
API_FOOTBALL_LEAGUE_ENTRIES: list[ApiFootballLeagueEntry] = [
    # --- Pilot (Phase 1) ---
    ApiFootballLeagueEntry(
        slug="premier-league",
        name="Premier League",
        league_id=39,
        kind="league",
        format=_LEAGUE,
        country="England",
        tier=1,
        sort_order=10,
        pilot=True,
        layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}},
    ),
    ApiFootballLeagueEntry(
        slug="fa-cup",
        name="FA Cup",
        league_id=45,
        kind="cup",
        format=_KNOCKOUT,
        country="England",
        sort_order=11,
        squad_scope="league_teams",
        pilot=True,
    ),
    ApiFootballLeagueEntry(
        slug="la-liga",
        name="La Liga",
        league_id=140,
        kind="league",
        format=_LEAGUE,
        country="Spain",
        tier=1,
        sort_order=20,
        pilot=True,
        layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}},
    ),
    ApiFootballLeagueEntry(
        slug="uefa-champions-league",
        name="UEFA Champions League",
        league_id=2,
        kind="continental",
        format=_LEAGUE_PHASE_KNOCKOUT,
        confederation="UEFA",
        sort_order=30,
        pilot=True,
    ),
    # --- England (full) ---
    ApiFootballLeagueEntry(
        slug="efl-cup",
        name="EFL Cup",
        league_id=48,
        kind="cup",
        format=_KNOCKOUT,
        country="England",
        sort_order=12,
        squad_scope="league_teams",
    ),
    # --- Spain (full) ---
    ApiFootballLeagueEntry(
        slug="copa-del-rey",
        name="Copa del Rey",
        league_id=143,
        kind="cup",
        format=_KNOCKOUT,
        country="Spain",
        sort_order=21,
        squad_scope="league_teams",
    ),
    # --- Germany ---
    ApiFootballLeagueEntry(
        slug="bundesliga",
        name="Bundesliga",
        league_id=78,
        kind="league",
        format=_LEAGUE,
        country="Germany",
        tier=1,
        sort_order=40,
        layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}},
    ),
    ApiFootballLeagueEntry(
        slug="dfb-pokal",
        name="DFB-Pokal",
        league_id=81,
        kind="cup",
        format=_KNOCKOUT,
        country="Germany",
        sort_order=41,
        squad_scope="league_teams",
    ),
    # --- Italy ---
    ApiFootballLeagueEntry(
        slug="serie-a",
        name="Serie A",
        league_id=135,
        kind="league",
        format=_LEAGUE,
        country="Italy",
        tier=1,
        sort_order=50,
        layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}},
    ),
    ApiFootballLeagueEntry(
        slug="coppa-italia",
        name="Coppa Italia",
        league_id=137,
        kind="cup",
        format=_KNOCKOUT,
        country="Italy",
        sort_order=51,
        squad_scope="league_teams",
    ),
    # --- France ---
    ApiFootballLeagueEntry(
        slug="ligue-1",
        name="Ligue 1",
        league_id=61,
        kind="league",
        format=_LEAGUE,
        country="France",
        tier=1,
        sort_order=60,
        layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}},
    ),
    ApiFootballLeagueEntry(
        slug="coupe-de-france",
        name="Coupe de France",
        league_id=66,
        kind="cup",
        format=_KNOCKOUT,
        country="France",
        sort_order=61,
        squad_scope="league_teams",
    ),
    # --- Other Europe tier-1 ---
    ApiFootballLeagueEntry("primeira-liga", "Primeira Liga", 94, "league", _LEAGUE, country="Portugal", tier=1, sort_order=70, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("eredivisie", "Eredivisie", 88, "league", _LEAGUE, country="Netherlands", tier=1, sort_order=71, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("pro-league", "Pro League", 144, "league", _LEAGUE, country="Belgium", tier=1, sort_order=72, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("super-lig", "Süper Lig", 203, "league", _LEAGUE, country="Turkey", tier=1, sort_order=73, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("scottish-premiership", "Scottish Premiership", 179, "league", _LEAGUE, country="Scotland", tier=1, sort_order=74, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("austrian-bundesliga", "Bundesliga", 218, "league", _LEAGUE, country="Austria", tier=1, sort_order=75, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("swiss-super-league", "Super League", 207, "league", _LEAGUE, country="Switzerland", tier=1, sort_order=76, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("greek-super-league", "Super League", 197, "league", _LEAGUE, country="Greece", tier=1, sort_order=77, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("superliga", "Superliga", 119, "league", _LEAGUE, country="Denmark", tier=1, sort_order=78, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("eliteserien", "Eliteserien", 103, "league", _LEAGUE, country="Norway", tier=1, sort_order=79, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("allsvenskan", "Allsvenskan", 113, "league", _LEAGUE, country="Sweden", tier=1, sort_order=80, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("ekstraklasa", "Ekstraklasa", 106, "league", _LEAGUE, country="Poland", tier=1, sort_order=81, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("fortuna-liga", "Fortuna Liga", 345, "league", _LEAGUE, country="Czech Republic", tier=1, sort_order=82, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("hnl", "HNL", 210, "league", _LEAGUE, country="Croatia", tier=1, sort_order=83, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("super-liga-serbia", "SuperLiga", 286, "league", _LEAGUE, country="Serbia", tier=1, sort_order=84, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("romanian-liga-1", "Liga I", 283, "league", _LEAGUE, country="Romania", tier=1, sort_order=85, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("ukrainian-premier-league", "Premier League", 334, "league", _LEAGUE, country="Ukraine", tier=1, sort_order=86, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    # --- Americas ---
    ApiFootballLeagueEntry("mls", "MLS", 253, "league", _LEAGUE, country="USA", tier=1, sort_order=100, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("liga-mx", "Liga MX", 262, "league", _LEAGUE, country="Mexico", tier=1, sort_order=101, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("brasileirao", "Brasileirão Série A", 71, "league", _LEAGUE, country="Brazil", tier=1, sort_order=102, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("copa-do-brasil", "Copa do Brasil", 73, "cup", _KNOCKOUT, country="Brazil", sort_order=103, squad_scope="league_teams"),
    ApiFootballLeagueEntry("liga-profesional", "Liga Profesional", 128, "league", _LEAGUE, country="Argentina", tier=1, sort_order=104, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("liga-colombia", "Liga BetPlay", 239, "league", _LEAGUE, country="Colombia", tier=1, sort_order=105, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("chile-primera", "Primera División", 265, "league", _LEAGUE, country="Chile", tier=1, sort_order=106, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("uruguay-primera", "Primera División", 268, "league", _LEAGUE, country="Uruguay", tier=1, sort_order=107, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    # --- Asia / Oceania / Africa ---
    ApiFootballLeagueEntry("j1-league", "J1 League", 98, "league", _LEAGUE, country="Japan", tier=1, sort_order=110, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("k-league", "K League 1", 292, "league", _LEAGUE, country="South Korea", tier=1, sort_order=111, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("saudi-pro-league", "Saudi Pro League", 307, "league", _LEAGUE, country="Saudi Arabia", tier=1, sort_order=112, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("a-league", "A-League", 188, "league", _LEAGUE, country="Australia", tier=1, sort_order=113, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("egyptian-premier", "Premier League", 233, "league", _LEAGUE, country="Egypt", tier=1, sort_order=114, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    ApiFootballLeagueEntry("south-africa-premiership", "Premiership", 288, "league", _LEAGUE, country="South Africa", tier=1, sort_order=115, layout_overrides={"standings": {"mode": "single", "zones": _LEAGUE_ZONES}}),
    # --- Continental club ---
    ApiFootballLeagueEntry(
        slug="uefa-europa-league",
        name="UEFA Europa League",
        league_id=3,
        kind="continental",
        format=_LEAGUE_PHASE_KNOCKOUT,
        confederation="UEFA",
        sort_order=31,
    ),
    ApiFootballLeagueEntry(
        slug="uefa-conference-league",
        name="UEFA Europa Conference League",
        league_id=848,
        kind="continental",
        format=_LEAGUE_PHASE_KNOCKOUT,
        confederation="UEFA",
        sort_order=32,
    ),
    ApiFootballLeagueEntry("copa-libertadores", "Copa Libertadores", 13, "continental", _LEAGUE_PHASE_KNOCKOUT, confederation="CONMEBOL", sort_order=120),
    ApiFootballLeagueEntry("copa-sudamericana", "Copa Sudamericana", 11, "continental", _LEAGUE_PHASE_KNOCKOUT, confederation="CONMEBOL", sort_order=121),
    ApiFootballLeagueEntry("concacaf-champions", "CONCACAF Champions Cup", 16, "continental", _KNOCKOUT, confederation="CONCACAF", sort_order=122),
    ApiFootballLeagueEntry("afc-champions", "AFC Champions League", 17, "continental", _LEAGUE_PHASE_KNOCKOUT, confederation="AFC", sort_order=123),
    ApiFootballLeagueEntry("caf-champions", "CAF Champions League", 12, "continental", _KNOCKOUT, confederation="CAF", sort_order=124),
    # --- International ---
    ApiFootballLeagueEntry("uefa-euro", "UEFA Euro", 4, "international", _GROUPS_KNOCKOUT, confederation="UEFA", sort_order=200, season_label="2024", year=2024),
    ApiFootballLeagueEntry("copa-america", "Copa América", 9, "international", _GROUPS_KNOCKOUT, confederation="CONMEBOL", sort_order=201, season_label="2024", year=2024),
    ApiFootballLeagueEntry("uefa-nations-league", "UEFA Nations League", 5, "international", _GROUPS_KNOCKOUT, confederation="UEFA", sort_order=202, season_label="2024", year=2024),
    ApiFootballLeagueEntry("afcon", "Africa Cup of Nations", 6, "international", _GROUPS_KNOCKOUT, confederation="CAF", sort_order=203, season_label="2023", year=2023),
    ApiFootballLeagueEntry("knvb-beker", "KNVB Beker", 90, "cup", _KNOCKOUT, country="Netherlands", sort_order=72, squad_scope="league_teams"),
]


def api_football_competition_defs() -> list[CompetitionDef]:
    return [_def(entry) for entry in API_FOOTBALL_LEAGUE_ENTRIES]


def pilot_slugs() -> list[str]:
    return [e.slug for e in API_FOOTBALL_LEAGUE_ENTRIES if e.pilot]


def league_id_for_slug(slug: str) -> int | None:
    for entry in API_FOOTBALL_LEAGUE_ENTRIES:
        if entry.slug == slug:
            return entry.league_id
    return None

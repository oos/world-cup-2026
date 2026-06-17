"""Competition-format taxonomy and the seed registry of competitions.

This module is the single source of truth for:
  * the set of supported competition formats (the "templates"), and
  * the declarative list of competitions used to seed the database and to
    drive the competition selector.

New countries/divisions are added in api_football_leagues.py as pure data.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field

# --- Format taxonomy ---------------------------------------------------------

FORMAT_LEAGUE = "league"
FORMAT_KNOCKOUT = "knockout"
FORMAT_GROUPS_KNOCKOUT = "groups_knockout"
FORMAT_LEAGUE_PHASE_KNOCKOUT = "league_phase_knockout"
FORMAT_LEAGUE_WITH_PLAYOFFS = "league_with_playoffs"

ALL_FORMATS = (
    FORMAT_LEAGUE,
    FORMAT_KNOCKOUT,
    FORMAT_GROUPS_KNOCKOUT,
    FORMAT_LEAGUE_PHASE_KNOCKOUT,
    FORMAT_LEAGUE_WITH_PLAYOFFS,
)

# Per-format layout templates. Each competition starts from its format template
# and may override individual keys via `layout_overrides`.
LAYOUT_TEMPLATES: dict[str, dict] = {
    FORMAT_LEAGUE: {
        "tabs": ["matches", "table", "teams"],
        "default_tab": "table",
        "standings": {"mode": "single", "zones": []},
        "bracket": None,
    },
    FORMAT_KNOCKOUT: {
        "tabs": ["matches", "bracket", "teams"],
        "default_tab": "bracket",
        "standings": None,
        "bracket": {"two_legged": False},
    },
    FORMAT_GROUPS_KNOCKOUT: {
        "tabs": ["matches", "groups", "standings", "bracket", "teams"],
        "default_tab": "standings",
        "standings": {"mode": "groups", "zones": [{"from": 1, "to": 2, "kind": "qualify"}]},
        "bracket": {"two_legged": False},
    },
    FORMAT_LEAGUE_PHASE_KNOCKOUT: {
        "tabs": ["matches", "table", "bracket", "teams"],
        "default_tab": "table",
        "standings": {
            "mode": "league_phase",
            "zones": [
                {"from": 1, "to": 8, "kind": "qualify", "label": "Round of 16"},
                {"from": 9, "to": 24, "kind": "playoff", "label": "Knockout play-offs"},
                {"from": 25, "to": 36, "kind": "out", "label": "Eliminated"},
            ],
        },
        "bracket": {"two_legged": True, "entry_round": "Knockout play-offs"},
    },
    FORMAT_LEAGUE_WITH_PLAYOFFS: {
        "tabs": ["matches", "table", "bracket", "teams"],
        "default_tab": "table",
        "standings": {"mode": "single", "zones": []},
        "bracket": {"two_legged": False, "label": "Play-offs"},
    },
}


def layout_for(fmt: str, overrides: dict | None = None) -> dict:
    """Return the resolved layout_config for a format, applying overrides."""
    base = copy.deepcopy(LAYOUT_TEMPLATES.get(fmt, {}))
    if overrides:
        for key, value in overrides.items():
            if isinstance(value, dict) and isinstance(base.get(key), dict):
                base[key] = {**base[key], **value}
            else:
                base[key] = value
    base["format"] = fmt
    return base


# --- Competition registry ----------------------------------------------------


@dataclass
class CompetitionDef:
    slug: str
    name: str
    year: int
    kind: str  # international | continental | league | cup
    format: str
    season_label: str
    country: str | None = None
    confederation: str | None = None
    tier: int | None = None
    logo_url: str | None = None
    sort_order: int = 100
    # data source descriptor consumed by the ingestion service
    source: dict = field(default_factory=dict)
    layout_overrides: dict = field(default_factory=dict)

    @property
    def layout_config(self) -> dict:
        return layout_for(self.format, self.layout_overrides)


COMPETITIONS: list[CompetitionDef] = [
    CompetitionDef(
        slug="world-cup-2026",
        name="World Cup 2026",
        year=2026,
        kind="international",
        format=FORMAT_GROUPS_KNOCKOUT,
        season_label="2026",
        confederation="FIFA",
        sort_order=0,
        source={"type": "worldcup"},
    ),
]


def _register_api_football_competitions() -> None:
    from app.data.api_football_leagues import api_football_competition_defs

    COMPETITIONS.extend(api_football_competition_defs())


_register_api_football_competitions()

DEFAULT_COMPETITION_SLUG = "world-cup-2026"


def competition_by_slug(slug: str) -> CompetitionDef | None:
    for comp in COMPETITIONS:
        if comp.slug == slug:
            return comp
    return None


def competition_slugs() -> list[str]:
    return [c.slug for c in COMPETITIONS]

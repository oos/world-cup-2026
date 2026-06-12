from dataclasses import dataclass, field
from datetime import date


@dataclass
class SquadPlayerDTO:
    name: str
    position: str | None = None
    jersey_number: int | None = None
    club: str | None = None
    wikidata_id: str | None = None
    api_football_id: str | None = None
    dob: date | None = None
    height_cm: float | None = None
    image_url: str | None = None
    nationality: str | None = None
    source: str = "unknown"


@dataclass
class TeamDTO:
    name: str
    fifa_code: str
    group_name: str | None = None
    confederation: str | None = None
    flag_icon: str | None = None
    continent: str | None = None
    name_normalised: str | None = None


@dataclass
class MatchDTO:
    round: str
    match_date: date | None
    match_time: str | None
    team1_name: str
    team2_name: str
    group_name: str | None = None
    stadium_name: str | None = None
    match_number: int | None = None
    score: dict | None = None


@dataclass
class StadiumDTO:
    name: str
    city: str | None = None
    country: str | None = None


@dataclass
class GapReport:
    teams_low_squad: list[str] = field(default_factory=list)
    players_missing_fields: list[int] = field(default_factory=list)
    matches_missing_scores: list[int] = field(default_factory=list)

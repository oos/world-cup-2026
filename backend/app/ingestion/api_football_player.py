"""Shared helpers for mapping API-Football player payloads to SquadPlayerDTO."""

from __future__ import annotations

from datetime import datetime

from app.ingestion.api_football_client import (
    club_from_statistics,
    normalize_api_position,
    world_cup_stat,
)
from app.ingestion.dto import SquadPlayerDTO
from app.models.tournament_team import TournamentTeam


def player_dto_from_api_row(
    row: dict,
    team_map: dict[int, TournamentTeam],
    *,
    source: str = "api_football",
) -> tuple[SquadPlayerDTO | None, TournamentTeam | None]:
    profile = row.get("player") or {}
    statistics = row.get("statistics") or []
    wc_stat = world_cup_stat(statistics)
    if not wc_stat:
        return None, None

    api_team_id = (wc_stat.get("team") or {}).get("id")
    if api_team_id is None:
        return None, None
    team = team_map.get(int(api_team_id))
    if not team:
        return None, None

    games = wc_stat.get("games") or {}
    birth = profile.get("birth") or {}
    dob = None
    if birth.get("date"):
        try:
            dob = datetime.strptime(birth["date"], "%Y-%m-%d").date()
        except ValueError:
            dob = None

    height_cm = None
    if profile.get("height"):
        try:
            height_cm = float(str(profile["height"]).replace(" cm", ""))
        except ValueError:
            height_cm = None

    jersey = games.get("number")
    try:
        jersey_number = int(jersey) if jersey is not None else None
    except (TypeError, ValueError):
        jersey_number = None

    api_id = profile.get("id")
    return (
        SquadPlayerDTO(
            name=(profile.get("name") or "").strip(),
            position=normalize_api_position(games.get("position")),
            jersey_number=jersey_number,
            club=club_from_statistics(statistics),
            api_football_id=str(api_id) if api_id is not None else None,
            dob=dob,
            height_cm=height_cm,
            image_url=profile.get("photo"),
            nationality=profile.get("nationality") or team.name,
            source=source,
        ),
        team,
    )


def player_dto_from_squad_member(
    row: dict,
    team: TournamentTeam,
    *,
    source: str = "api_football",
) -> SquadPlayerDTO:
    api_id = row.get("id")
    jersey = row.get("number")
    try:
        jersey_number = int(jersey) if jersey is not None else None
    except (TypeError, ValueError):
        jersey_number = None

    return SquadPlayerDTO(
        name=(row.get("name") or "").strip(),
        position=normalize_api_position(row.get("position")),
        jersey_number=jersey_number,
        club=None,
        api_football_id=str(api_id) if api_id is not None else None,
        dob=None,
        height_cm=None,
        image_url=row.get("photo"),
        nationality=team.name,
        source=source,
    )

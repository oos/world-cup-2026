"""Shared helpers for seeding history data in tests."""

from __future__ import annotations

from app.extensions import db
from app.models.match import Match
from app.models.nation import Nation
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.services.history_service import HistoryService


def seed_history_matches(matches: list[dict]) -> None:
    history = HistoryService()
    for payload in matches:
        year = payload["year"]
        tournament = history._ensure_tournament(year)
        history._upsert_match(tournament, payload)
    db.session.commit()


def seed_nation(
    *,
    name: str,
    fifa_code: str,
    flag_iso: str | None = None,
) -> Nation:
    nation = Nation(name=name, fifa_code=fifa_code, flag_iso=flag_iso, aliases=[])
    db.session.add(nation)
    db.session.flush()
    return nation


def seed_tournament_team(
    *,
    tournament: Tournament,
    nation: Nation,
    group_name: str | None = None,
) -> TournamentTeam:
    team = TournamentTeam(
        tournament_id=tournament.id,
        nation_id=nation.id,
        group_name=group_name,
    )
    db.session.add(team)
    db.session.flush()
    return team

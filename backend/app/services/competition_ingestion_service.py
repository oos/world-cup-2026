"""Format-aware ingestion for any competition in the registry.

Ensures the competition row, upserts its teams (clubs), and upserts matches with
the correct stage/leg/group so the standings + bracket services can render the
right template.
"""

from __future__ import annotations

import re
from datetime import date, datetime

from app.data.competitions import CompetitionDef, competition_by_slug
from app.data.sample_competitions import get_sample_competition
from app.extensions import db
from app.ingestion.openfootball_league_client import OpenFootballLeagueClient
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.services.match_upsert_service import MatchUpsertService


def _short_code(name: str) -> str:
    cleaned = re.sub(r"\b(FC|CF|AFC|SC|AC|SD|CD|UD|RC)\b", "", name, flags=re.IGNORECASE)
    letters = re.sub(r"[^A-Za-z]", "", cleaned).upper()
    return (letters[:3] or name[:3].upper()).ljust(3, "X")[:3]


class CompetitionIngestionService:
    def __init__(self) -> None:
        self.match_upsert = MatchUpsertService()

    def ensure_competition(self, comp: CompetitionDef) -> Tournament:
        tournament = db.session.scalars(
            db.select(Tournament).where(Tournament.external_key == comp.slug)
        ).first()
        if not tournament:
            tournament = Tournament(name=comp.name, year=comp.year, external_key=comp.slug)
            db.session.add(tournament)
        tournament.name = comp.name
        tournament.year = comp.year
        tournament.kind = comp.kind
        tournament.format = comp.format
        tournament.country = comp.country
        tournament.confederation = comp.confederation
        tournament.tier = comp.tier
        tournament.season_label = comp.season_label
        tournament.logo_url = comp.logo_url
        tournament.layout_config = comp.layout_config
        tournament.sort_order = comp.sort_order
        db.session.flush()
        return tournament

    def seed_all(self) -> dict:
        from app.data.competitions import COMPETITIONS

        results: dict[str, str] = {}
        for comp in COMPETITIONS:
            self.ensure_competition(comp)
            results[comp.slug] = "ensured"
        db.session.commit()
        return {"competitions": results}

    def ingest(self, slug: str) -> dict:
        comp = competition_by_slug(slug)
        if not comp:
            raise ValueError(f"Unknown competition: {slug}")
        tournament = self.ensure_competition(comp)
        source = comp.source or {}
        source_type = source.get("type")

        if source_type == "openfootball_league":
            result = self._ingest_openfootball_league(tournament, source)
        elif source_type == "sample":
            result = self._ingest_sample(tournament, source)
        elif source_type == "worldcup":
            # The World Cup is ingested by the dedicated IngestionService (sync-data).
            result = {"skipped": True, "reason": "use sync-data for the World Cup"}
        elif source_type == "api_football":
            from app.services.api_football_competition_backfill_service import (
                ApiFootballCompetitionBackfillService,
            )

            backfill = ApiFootballCompetitionBackfillService()
            result = backfill.run(slug=slug, budget=10_000)
        else:
            raise ValueError(f"Unsupported source type for {slug}: {source_type}")

        tournament.synced_at = datetime.utcnow()
        db.session.commit()
        return {"slug": slug, **result}

    # --- sources -------------------------------------------------------------

    def _ingest_openfootball_league(self, tournament: Tournament, source: dict) -> dict:
        client = OpenFootballLeagueClient(code=source["code"], season=source["season"])
        try:
            dtos = client.fetch_matches()
        finally:
            client.close()

        team_map = self._team_map(tournament)
        team_names: list[str] = []
        for dto in dtos:
            for name in (dto.team1_name, dto.team2_name):
                if name and name not in team_names:
                    team_names.append(name)
        for name in team_names:
            self._ensure_club(tournament, name, team_map)
        db.session.flush()

        count = 0
        for dto in dtos:
            team1 = team_map.get(dto.team1_name)
            team2 = team_map.get(dto.team2_name)
            self.match_upsert.upsert_from_openfootball(
                tournament,
                round_name=dto.round,
                match_number=dto.match_number,
                match_date=dto.match_date,
                match_time=dto.match_time,
                group_name=None,
                team1=team1,
                team2=team2,
                team1_name=dto.team1_name,
                team2_name=dto.team2_name,
                stadium_id=None,
                score=dto.score,
                stage="league",
            )
            count += 1
        return {"teams": len(team_names), "matches": count}

    def _ingest_sample(self, tournament: Tournament, source: dict) -> dict:
        data = get_sample_competition(source["key"])
        if not data:
            raise ValueError(f"No sample data for key: {source['key']}")

        team_map = self._team_map(tournament)
        for name in data.get("teams", []):
            self._ensure_club(tournament, name, team_map)
        db.session.flush()

        count = 0
        for item in data.get("matches", []):
            t1_name = item["team1"]
            t2_name = item["team2"]
            self._ensure_club(tournament, t1_name, team_map)
            self._ensure_club(tournament, t2_name, team_map)
            db.session.flush()
            self.match_upsert.upsert_from_openfootball(
                tournament,
                round_name=item.get("round"),
                match_number=item.get("num"),
                match_date=self._parse_date(item.get("date")),
                match_time=item.get("time"),
                group_name=item.get("group"),
                team1=team_map.get(t1_name),
                team2=team_map.get(t2_name),
                team1_name=t1_name,
                team2_name=t2_name,
                stadium_id=None,
                score=item.get("score"),
                stage=item.get("stage"),
                leg=item.get("leg"),
            )
            count += 1
        return {"teams": len(data.get("teams", [])), "matches": count}

    # --- helpers -------------------------------------------------------------

    def _team_map(self, tournament: Tournament) -> dict[str, TournamentTeam]:
        teams = db.session.scalars(
            db.select(TournamentTeam).where(TournamentTeam.tournament_id == tournament.id)
        ).all()
        mapping: dict[str, TournamentTeam] = {}
        for team in teams:
            if team.display_name:
                mapping[team.display_name] = team
        return mapping

    def _ensure_club(
        self,
        tournament: Tournament,
        name: str,
        team_map: dict[str, TournamentTeam],
    ) -> TournamentTeam:
        if name in team_map:
            return team_map[name]
        team = TournamentTeam(
            tournament_id=tournament.id,
            nation_id=None,
            display_name=name,
            short_code=_short_code(name),
        )
        db.session.add(team)
        team_map[name] = team
        return team

    @staticmethod
    def _parse_date(value: str | None) -> date | None:
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

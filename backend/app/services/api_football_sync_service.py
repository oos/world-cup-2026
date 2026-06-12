"""Sync 2026 World Cup squads from API-Football into Postgres."""

from __future__ import annotations

from datetime import datetime

from flask import current_app

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.ingestion.api_football_client import (
    WORLD_CUP_LEAGUE_ID,
    ApiFootballClient,
    club_from_statistics,
    normalize_api_position,
    world_cup_stat,
)
from app.ingestion.dto import SquadPlayerDTO
from app.ingestion.ingestion_service import IngestionService
from app.ingestion.team_mapper import name_to_fifa
from app.models.ingestion_run import IngestionRun
from app.models.tournament_team import TournamentTeam


class ApiFootballSyncService:
    SOURCE = "api_football"

    def __init__(self, ingestion: IngestionService | None = None) -> None:
        self.ingestion = ingestion or IngestionService()

    def sync(self, *, players: bool = True, fixtures: bool = False, season: int = CURRENT_TOURNAMENT_YEAR) -> dict:
        api_key = current_app.config.get("API_FOOTBALL_KEY") or ""
        if not api_key:
            return {"skipped": True, "reason": "API_FOOTBALL_KEY not configured"}

        client = ApiFootballClient(api_key)
        run = self.ingestion._start_run(self.SOURCE)
        results: dict = {"requests": 0, "players": 0, "fixtures": 0, "teams_mapped": 0}
        try:
            league = client.fetch_league(league_id=WORLD_CUP_LEAGUE_ID, season=season)
            if not league:
                raise RuntimeError(f"World Cup league {WORLD_CUP_LEAGUE_ID} not available for season {season}")

            team_map = self._map_teams(client, season)
            results["teams_mapped"] = len(team_map)

            if players:
                results["players"] = self._sync_players(client, team_map, season)

            if fixtures:
                results["fixtures"] = self._sync_fixtures(client, season)

            db.session.commit()
            results["requests"] = client.request_count
            self.ingestion._finish_run(run, results["players"] + results["fixtures"])
        except Exception as exc:
            db.session.rollback()
            results["requests"] = client.request_count
            self.ingestion._finish_run(run, 0, errors=[str(exc)])
            raise
        finally:
            client.close()

        return results

    def _map_teams(self, client: ApiFootballClient, season: int) -> dict[int, TournamentTeam]:
        mapped: dict[int, TournamentTeam] = {}
        for row in client.fetch_teams(league_id=WORLD_CUP_LEAGUE_ID, season=season):
            api_team = row.get("team") or {}
            api_id = api_team.get("id")
            if api_id is None:
                continue
            fifa = (api_team.get("code") or "").upper() or name_to_fifa(api_team.get("name") or "")
            if not fifa:
                continue
            team = self.ingestion.team_repo.get_by_fifa_code(fifa, tournament_year=season)
            if team:
                mapped[int(api_id)] = team
        return mapped

    def _sync_players(
        self,
        client: ApiFootballClient,
        team_map: dict[int, TournamentTeam],
        season: int,
    ) -> int:
        count = 0
        for row in client.fetch_players(league_id=WORLD_CUP_LEAGUE_ID, season=season):
            dto, team = self._player_dto(row, team_map)
            if not dto or not team:
                continue
            count += self.ingestion._upsert_player(dto, team, fill_only=False)
        return count

    def _player_dto(
        self,
        row: dict,
        team_map: dict[int, TournamentTeam],
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
                source=self.SOURCE,
            ),
            team,
        )

    def _sync_fixtures(self, client: ApiFootballClient, season: int) -> int:
        # Fixture upsert is handled by openfootball today; reserved for a later pass.
        return len(client.fetch_fixtures(league_id=WORLD_CUP_LEAGUE_ID, season=season))

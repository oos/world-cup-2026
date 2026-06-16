"""Sync World Cup squads from API-Football into Postgres."""

from __future__ import annotations

from flask import current_app

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.ingestion.api_football_client import WORLD_CUP_LEAGUE_ID, ApiFootballClient
from app.ingestion.api_football_player import player_dto_from_api_row
from app.ingestion.ingestion_service import IngestionService
from app.ingestion.team_mapper import name_to_fifa
from app.models.tournament_team import TournamentTeam


class ApiFootballSyncService:
    SOURCE = "api_football"

    def __init__(self, ingestion: IngestionService | None = None) -> None:
        self.ingestion = ingestion or IngestionService()

    def sync(
        self,
        *,
        all_teams: bool = False,
        players: bool = True,
        fixtures: bool = False,
        season: int = CURRENT_TOURNAMENT_YEAR,
    ) -> dict:
        if not all_teams:
            return {
                "skipped": True,
                "reason": (
                    "Full-league sync disabled by default (uses ~70–100 requests/day). "
                    "Use sync-api-football-proof for daily proof sync, or pass --all-teams."
                ),
            }

        api_key = current_app.config.get("API_FOOTBALL_KEY") or ""
        if not api_key:
            return {"skipped": True, "reason": "API_FOOTBALL_KEY not configured"}

        if current_app.config.get("API_FOOTBALL_PROOF_MODE", True) and season >= 2026:
            return {
                "skipped": True,
                "reason": (
                    "API_FOOTBALL_PROOF_MODE is enabled and season=2026 requires Pro. "
                    "Use sync-api-football-proof or disable proof mode after upgrading."
                ),
            }

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
            dto, team = player_dto_from_api_row(row, team_map, source=self.SOURCE)
            if not dto or not team:
                continue
            count += self.ingestion._upsert_player(dto, team, fill_only=False)
        return count

    def _sync_fixtures(self, client: ApiFootballClient, season: int) -> int:
        from datetime import datetime

        from sqlalchemy import select

        from app.models.match import Match
        from app.models.tournament import Tournament

        def team_code(name: str | None, code: str | None) -> str:
            value = (code or name or "").strip()
            return (name_to_fifa(value) or value).lower()

        updated = 0
        matches_by_key: dict[frozenset[str], Match] = {}
        for match in db.session.scalars(
            select(Match)
            .join(Match.tournament)
            .where(Tournament.year == season)
        ).all():
            if not match.team1 or not match.team2 or not match.match_date:
                continue
            matches_by_key[
                frozenset(
                    {
                        team_code(match.team1.name, match.team1.fifa_code),
                        team_code(match.team2.name, match.team2.fifa_code),
                    }
                )
            ] = match

        for row in client.fetch_fixtures(league_id=WORLD_CUP_LEAGUE_ID, season=season):
            fixture = row.get("fixture") or {}
            fixture_id = fixture.get("id")
            date_text = fixture.get("date")
            if fixture_id is None or not date_text:
                continue

            try:
                match_date = datetime.fromisoformat(
                    date_text.replace("Z", "+00:00")
                ).date()
            except ValueError:
                continue

            teams = row.get("teams") or {}
            home = teams.get("home") or {}
            away = teams.get("away") or {}
            home_code = team_code(home.get("name"), home.get("code"))
            away_code = team_code(away.get("name"), away.get("code"))
            if not home_code or not away_code:
                continue

            db_match = matches_by_key.get(frozenset({home_code, away_code}))
            if not db_match or db_match.match_date != match_date:
                continue

            if db_match.api_football_fixture_id != int(fixture_id):
                db_match.api_football_fixture_id = int(fixture_id)
                updated += 1

        return updated

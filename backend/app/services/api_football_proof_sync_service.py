"""Daily API-Football proof sync (WC 2022 on free tier → WC 2026 on Pro)."""

from __future__ import annotations

from datetime import datetime, timezone

from flask import current_app
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.ingestion.api_football_client import (
    WORLD_CUP_LEAGUE_ID,
    ApiFootballBudgetError,
    ApiFootballClient,
    link_fixture_id,
)
from app.ingestion.api_football_player import player_dto_from_api_row
from app.ingestion.ingestion_service import IngestionService
from app.ingestion.team_mapper import name_to_fifa
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.repositories.match_repository import MatchRepository
from app.services.nation_service import NationService


class ApiFootballProofSyncService:
    SOURCE = "api_football_proof"

    def __init__(
        self,
        ingestion: IngestionService | None = None,
        match_repo: MatchRepository | None = None,
        nation_service: NationService | None = None,
    ) -> None:
        self.ingestion = ingestion or IngestionService()
        self.match_repo = match_repo or MatchRepository()
        self.nation_service = nation_service or NationService()

    def run(
        self,
        *,
        match_key: str | None = None,
        dry_run: bool = False,
        budget: int | None = None,
    ) -> dict:
        if current_app.config.get("API_FOOTBALL_PROOF_MODE", True):
            return self.run_daily_proof(
                match_key=match_key,
                dry_run=dry_run,
                budget=budget,
            )
        return self.run_production_sync(
            match_key=match_key,
            dry_run=dry_run,
            budget=budget,
        )

    def run_daily_proof(
        self,
        *,
        match_key: str | None = None,
        dry_run: bool = False,
        budget: int | None = None,
    ) -> dict:
        api_key = current_app.config.get("API_FOOTBALL_KEY") or ""
        if not api_key:
            return {"skipped": True, "reason": "API_FOOTBALL_KEY not configured"}

        proof_season = int(current_app.config.get("API_FOOTBALL_PROOF_SEASON", 2022))
        default_match_key = current_app.config.get(
            "API_FOOTBALL_PROOF_MATCH_KEY",
            "2022-12-18-argentina-vs-france",
        )
        budget_limit = budget if budget is not None else int(
            current_app.config.get("API_FOOTBALL_DAILY_BUDGET", 95)
        )
        reserve = max(0, 100 - budget_limit)

        match = self._resolve_match(
            match_key=match_key or default_match_key,
            tournament_year=proof_season,
        )
        if match is None:
            return {"skipped": True, "reason": f"No match found for key {match_key or default_match_key}"}

        plan = self._build_plan(match, season=proof_season, proof_mode=True)
        if dry_run:
            return {
                "dry_run": True,
                "proof_mode": True,
                "season": proof_season,
                "match_key": match.match_key,
                "planned_steps": plan,
                "estimated_requests": self._estimate_requests(plan),
                "budget": budget_limit,
            }

        client = ApiFootballClient(api_key)
        run = self.ingestion._start_run(self.SOURCE)
        results: dict = {
            "proof_mode": True,
            "season": proof_season,
            "match_key": match.match_key,
            "match_id": match.id,
            "steps": [],
            "players_upserted": 0,
        }
        try:
            results.update(
                self._execute_pipeline(
                    client,
                    match,
                    season=proof_season,
                    proof_mode=True,
                    budget_limit=budget_limit,
                    reserve=reserve,
                    plan=plan,
                )
            )
            db.session.commit()
            results.update(client.quota_summary())
            self.ingestion._finish_run(
                run,
                results.get("players_upserted", 0),
                errors=results.get("step_errors") or None,
            )
        except Exception as exc:
            db.session.rollback()
            results.update(client.quota_summary())
            self.ingestion._finish_run(run, 0, errors=[str(exc)])
            raise
        finally:
            client.close()

        results["inspect_url"] = (
            f"/api/v1/history/matches/{proof_season}/{match.match_key}"
        )
        return results

    def run_production_sync(
        self,
        *,
        match_key: str | None = None,
        dry_run: bool = False,
        budget: int | None = None,
    ) -> dict:
        api_key = current_app.config.get("API_FOOTBALL_KEY") or ""
        if not api_key:
            return {"skipped": True, "reason": "API_FOOTBALL_KEY not configured"}

        season = int(current_app.config.get("API_FOOTBALL_SEASON", CURRENT_TOURNAMENT_YEAR))
        budget_limit = budget if budget is not None else int(
            current_app.config.get("API_FOOTBALL_DAILY_BUDGET", 95)
        )
        reserve = max(0, 100 - budget_limit)

        if match_key:
            match = self._resolve_match(match_key=match_key, tournament_year=season)
        else:
            match = self.match_repo.get_next_upcoming(tournament_year=season)
        if match is None:
            return {"skipped": True, "reason": "No upcoming match found"}

        plan = self._build_plan(match, season=season, proof_mode=False)
        if dry_run:
            return {
                "dry_run": True,
                "proof_mode": False,
                "season": season,
                "match_key": match.match_key,
                "planned_steps": plan,
                "estimated_requests": self._estimate_requests(plan),
                "budget": budget_limit,
            }

        client = ApiFootballClient(api_key)
        run = self.ingestion._start_run("api_football_next_match")
        results: dict = {
            "proof_mode": False,
            "season": season,
            "match_key": match.match_key,
            "match_id": match.id,
            "steps": [],
            "players_upserted": 0,
        }
        try:
            results.update(
                self._execute_pipeline(
                    client,
                    match,
                    season=season,
                    proof_mode=False,
                    budget_limit=budget_limit,
                    reserve=reserve,
                    plan=plan,
                )
            )
            db.session.commit()
            results.update(client.quota_summary())
            self.ingestion._finish_run(
                run,
                results.get("players_upserted", 0),
                errors=results.get("step_errors") or None,
            )
        except Exception as exc:
            db.session.rollback()
            results.update(client.quota_summary())
            self.ingestion._finish_run(run, 0, errors=[str(exc)])
            raise
        finally:
            client.close()

        return results

    def _resolve_match(self, *, match_key: str, tournament_year: int) -> Match | None:
        return db.session.scalars(
            select(Match)
            .join(Match.tournament)
            .options(
                joinedload(Match.team1).joinedload(TournamentTeam.nation),
                joinedload(Match.team2).joinedload(TournamentTeam.nation),
            )
            .where(Tournament.year == tournament_year, Match.match_key == match_key)
        ).first()

    def _build_plan(self, match: Match, *, season: int, proof_mode: bool) -> list[dict]:
        team1_fifa = match.team1.fifa_code if match.team1 else ""
        team2_fifa = match.team2.fifa_code if match.team2 else ""
        steps = []
        if not self._team_ids_cached([team1_fifa, team2_fifa]):
            steps.append(
                {
                    "step": "bootstrap_team_ids",
                    "endpoint": "/teams",
                    "params": {"league": WORLD_CUP_LEAGUE_ID, "season": season},
                    "cost": 1,
                }
            )
        if not match.api_football_fixture_id:
            steps.append(
                {
                    "step": "link_fixture",
                    "endpoint": "/fixtures",
                    "params": {
                        "league": WORLD_CUP_LEAGUE_ID,
                        "season": season,
                    },
                    "cost": 1,
                }
            )
        for fifa in (team1_fifa, team2_fifa):
            steps.append(
                {
                    "step": "enrich_squad",
                    "endpoint": "/players",
                    "team_fifa": fifa,
                    "params": {"team": f"<{fifa}_api_id>", "season": season},
                    "cost": 2,
                }
            )
        fixture_ref = match.api_football_fixture_id or "<fixture_id>"
        for step_name, endpoint, cost in (
            ("fetch_injuries", "/injuries", 1),
            ("fetch_predictions", "/predictions", 1),
            ("fetch_headtohead", "/fixtures/headtohead", 1),
            ("fetch_lineups", "/fixtures/lineups", 1),
        ):
            steps.append(
                {
                    "step": step_name,
                    "endpoint": endpoint,
                    "params": {"fixture": fixture_ref},
                    "cost": cost,
                }
            )
        if proof_mode:
            steps.append({"step": "persist_proof_metadata", "endpoint": None, "cost": 0})
        return steps

    @staticmethod
    def _estimate_requests(plan: list[dict]) -> int:
        return sum(step.get("cost", 0) for step in plan)

    def _execute_pipeline(
        self,
        client: ApiFootballClient,
        match: Match,
        *,
        season: int,
        proof_mode: bool,
        budget_limit: int,
        reserve: int,
        plan: list[dict],
    ) -> dict:
        steps: list[dict] = []
        step_errors: list[str] = []
        players_upserted = 0
        team1_fifa = match.team1.fifa_code if match.team1 else ""
        team2_fifa = match.team2.fifa_code if match.team2 else ""

        if not self._team_ids_cached([team1_fifa, team2_fifa]):
            client.ensure_budget(1, reserve=reserve)
            mapped = self._bootstrap_team_ids(client, season)
            steps.append({"step": "bootstrap_team_ids", "nations_updated": mapped})

        team_map = self._team_map_for_match(match)
        fixture_id = match.api_football_fixture_id

        if not fixture_id:
            client.ensure_budget(1, reserve=reserve)
            try:
                fixtures = client.fetch_fixtures(
                    league_id=WORLD_CUP_LEAGUE_ID,
                    season=season,
                )
            except RuntimeError as exc:
                step_errors.append(str(exc))
                fixtures = []
            fixture_id = link_fixture_id(
                fixtures,
                team1_fifa=team1_fifa,
                team2_fifa=team2_fifa,
                team1_name=match.team1.name if match.team1 else None,
                team2_name=match.team2.name if match.team2 else None,
                match_date=match.match_date.isoformat() if match.match_date else None,
            )
            if fixture_id:
                match.api_football_fixture_id = fixture_id
            steps.append({"step": "link_fixture", "fixture_id": fixture_id})

        for api_team_id, team in team_map.items():
            try:
                client.ensure_budget(1, reserve=reserve)
            except ApiFootballBudgetError as exc:
                step_errors.append(str(exc))
                break
            rows = client.fetch_players_by_team(team_id=api_team_id, season=season)
            count = 0
            for row in rows:
                dto, mapped_team = player_dto_from_api_row(row, team_map, source=self.SOURCE)
                if not dto or not mapped_team:
                    continue
                count += self.ingestion._upsert_player(dto, mapped_team, fill_only=False)
            players_upserted += count
            steps.append(
                {
                    "step": "enrich_squad",
                    "team_fifa": team.fifa_code,
                    "players_upserted": count,
                }
            )

        preview: dict = {}
        if fixture_id:
            preview = self._fetch_preview_bundle(
                client,
                match,
                fixture_id=fixture_id,
                team_map=team_map,
                reserve=reserve,
                step_errors=step_errors,
                steps=steps,
            )

        enriched_at = datetime.now(timezone.utc).isoformat()
        data_sources = dict(match.data_sources or {})
        data_sources.update(
            {
                "api_football_fixture_id": fixture_id,
                "api_football_season": season,
                "proof_mode": proof_mode,
                "enriched_at": enriched_at,
                "requests_used": client.request_count,
                "squads_enriched": [team1_fifa, team2_fifa],
                "preview": {
                    **preview,
                    "synced_at": enriched_at,
                },
            }
        )
        match.data_sources = data_sources

        return {
            "steps": steps,
            "players_upserted": players_upserted,
            "fixture_id": fixture_id,
            "step_errors": step_errors,
        }

    def _fetch_preview_bundle(
        self,
        client: ApiFootballClient,
        match: Match,
        *,
        fixture_id: int,
        team_map: dict[int, TournamentTeam],
        reserve: int,
        step_errors: list[str],
        steps: list[dict],
    ) -> dict:
        preview: dict = {}

        fetchers = (
            ("injuries", lambda: client.fetch_injuries(fixture_id=fixture_id)),
            ("predictions", lambda: client.fetch_predictions(fixture_id=fixture_id)),
        )
        for key, fetch in fetchers:
            try:
                client.ensure_budget(1, reserve=reserve)
                preview[key] = fetch()
                steps.append({"step": f"fetch_{key}", "count": len(preview[key])})
            except ApiFootballBudgetError as exc:
                step_errors.append(str(exc))
                break
            except RuntimeError as exc:
                step_errors.append(str(exc))

        if match.team1 and match.team2:
            team1_api = self._api_team_id(match.team1)
            team2_api = self._api_team_id(match.team2)
            if team1_api and team2_api:
                try:
                    client.ensure_budget(1, reserve=reserve)
                    preview["head_to_head"] = client.fetch_headtohead(
                        team1_id=team1_api,
                        team2_id=team2_api,
                        last=5,
                    )
                    steps.append(
                        {
                            "step": "fetch_headtohead",
                            "count": len(preview["head_to_head"]),
                        }
                    )
                except ApiFootballBudgetError as exc:
                    step_errors.append(str(exc))
                except RuntimeError as exc:
                    step_errors.append(str(exc))

        try:
            client.ensure_budget(1, reserve=reserve)
            preview["lineups"] = client.fetch_fixture_lineups(fixture_id=fixture_id)
            steps.append({"step": "fetch_lineups", "count": len(preview["lineups"])})
        except ApiFootballBudgetError as exc:
            step_errors.append(str(exc))
        except RuntimeError as exc:
            step_errors.append(str(exc))

        return preview

    def _bootstrap_team_ids(self, client: ApiFootballClient, season: int) -> int:
        updated = 0
        for row in client.fetch_teams(league_id=WORLD_CUP_LEAGUE_ID, season=season):
            api_team = row.get("team") or {}
            api_id = api_team.get("id")
            if api_id is None:
                continue
            fifa = (api_team.get("code") or "").upper() or name_to_fifa(api_team.get("name") or "")
            if not fifa:
                continue
            nation = self.nation_service.get_by_fifa_code(fifa)
            if nation is None:
                continue
            sources = dict(nation.data_sources or {})
            sources["api_football_team_id"] = int(api_id)
            sources["api_football_team_id_season"] = season
            nation.data_sources = sources
            updated += 1
        db.session.flush()
        return updated

    def _team_ids_cached(self, fifa_codes: list[str]) -> bool:
        for code in fifa_codes:
            if not code:
                return False
            nation = self.nation_service.get_by_fifa_code(code)
            if nation is None:
                return False
            if not (nation.data_sources or {}).get("api_football_team_id"):
                return False
        return True

    def _team_map_for_match(self, match: Match) -> dict[int, TournamentTeam]:
        mapped: dict[int, TournamentTeam] = {}
        for tournament_team in (match.team1, match.team2):
            if tournament_team is None or tournament_team.nation is None:
                continue
            api_id = self._api_team_id(tournament_team)
            if api_id is not None:
                mapped[api_id] = tournament_team
        return mapped

    @staticmethod
    def _api_team_id(tournament_team: TournamentTeam) -> int | None:
        if tournament_team.nation is None:
            return None
        sources = tournament_team.nation.data_sources or {}
        api_id = sources.get("api_football_team_id")
        if api_id is None:
            return None
        return int(api_id)

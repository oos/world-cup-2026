"""Resumable, budget-capped API-Football competition backfill."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from flask import current_app
from sqlalchemy import select

from app.data.competitions import CompetitionDef, competition_by_slug
from app.data.api_football_leagues import pilot_slugs
from app.extensions import db
from app.ingestion.api_football_client import ApiFootballBudgetError, ApiFootballClient
from app.ingestion.api_football_fixture import parse_api_fixture
from app.ingestion.api_football_player import player_dto_from_squad_member
from app.ingestion.ingestion_service import IngestionService
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.services.competition_ingestion_service import CompetitionIngestionService
from app.services.match_upsert_service import MatchUpsertService

SOURCE = "api_football_competition"
STEPS = ("fetch_league", "fetch_teams", "fetch_fixtures", "fetch_squads")


class ApiFootballCompetitionBackfillService:
    def __init__(
        self,
        ingestion: IngestionService | None = None,
        competition_ingestion: CompetitionIngestionService | None = None,
        match_upsert: MatchUpsertService | None = None,
    ) -> None:
        self.ingestion = ingestion or IngestionService()
        self.competition_ingestion = competition_ingestion or CompetitionIngestionService()
        self.match_upsert = match_upsert or MatchUpsertService()

    def run(
        self,
        *,
        slug: str | None = None,
        dry_run: bool = False,
        budget: int | None = None,
        force_step: str | None = None,
    ) -> dict:
        if not current_app.config.get("API_FOOTBALL_BACKFILL_ENABLED", True):
            return {"skipped": True, "reason": "API_FOOTBALL_BACKFILL_ENABLED is false"}

        api_key = current_app.config.get("API_FOOTBALL_KEY") or ""
        if not api_key and not dry_run:
            return {"skipped": True, "reason": "API_FOOTBALL_KEY not configured"}

        budget_limit = budget if budget is not None else int(
            current_app.config.get("API_FOOTBALL_COMPETITION_BUDGET", 90)
        )
        season = int(current_app.config.get("API_FOOTBALL_BACKFILL_SEASON", 2024))
        priority = current_app.config.get("API_FOOTBALL_BACKFILL_PRIORITY", "pilot")

        targets = self._target_competitions(slug=slug, priority=priority)
        if not targets:
            return {"skipped": True, "reason": "No competitions matched", "priority": priority}

        if dry_run:
            plan = []
            for comp in targets:
                tournament = self.competition_ingestion.ensure_competition(comp)
                state = self._backfill_state(tournament)
                plan.append(
                    {
                        "slug": comp.slug,
                        "status": state.get("status"),
                        "next_steps": self._pending_steps(state),
                        "squads_remaining": len(state.get("squads_pending") or []),
                    }
                )
            return {
                "dry_run": True,
                "season": season,
                "budget": budget_limit,
                "priority": priority,
                "competitions": plan,
            }

        client = ApiFootballClient(api_key)
        run = self.ingestion._start_run(SOURCE)
        results: dict = {
            "season": season,
            "budget": budget_limit,
            "requests_used": 0,
            "competitions_touched": [],
            "steps": [],
        }
        reserve = 0
        try:
            for comp in targets:
                if client.request_count >= budget_limit:
                    break
                tournament = self.competition_ingestion.ensure_competition(comp)
                if force_step and comp.slug != slug:
                    continue
                touch = self._process_competition(
                    client,
                    comp,
                    tournament,
                    season=season,
                    budget_limit=budget_limit,
                    reserve=reserve,
                    force_step=force_step if comp.slug == slug else None,
                )
                if touch.get("steps"):
                    results["competitions_touched"].append(comp.slug)
                    results["steps"].extend(touch["steps"])
                db.session.commit()
                if client.request_count >= budget_limit:
                    break

            results["requests_used"] = client.request_count
            results.update(client.quota_summary())
            self.ingestion._finish_run(
                run,
                results.get("requests_used", 0),
                errors=results.get("errors"),
            )
            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            results["requests_used"] = client.request_count
            self.ingestion._finish_run(run, 0, errors=[str(exc)])
            db.session.commit()
            raise
        finally:
            client.close()

        return results

    def status(self) -> dict:
        priority = current_app.config.get("API_FOOTBALL_BACKFILL_PRIORITY", "pilot")
        season = int(current_app.config.get("API_FOOTBALL_BACKFILL_SEASON", 2024))
        rows = []
        for comp in self._target_competitions(priority=priority):
            tournament = db.session.scalars(
                select(Tournament).where(Tournament.external_key == comp.slug)
            ).first()
            state = self._backfill_state(tournament) if tournament else {}
            rows.append(
                {
                    "slug": comp.slug,
                    "name": comp.name,
                    "pilot": (comp.source or {}).get("pilot", False),
                    "status": state.get("status", "pending"),
                    "completed_steps": state.get("completed_steps") or [],
                    "fixtures_page": state.get("fixtures_page"),
                    "fixtures_total_pages": state.get("fixtures_total_pages"),
                    "squads_pending": len(state.get("squads_pending") or []),
                    "squads_done": len(state.get("squads_done") or []),
                    "last_run_at": state.get("last_run_at"),
                    "last_error": state.get("last_error"),
                }
            )
        complete = sum(1 for r in rows if r["status"] == "complete")
        return {
            "season": season,
            "priority": priority,
            "total": len(rows),
            "complete": complete,
            "competitions": rows,
        }

    def _target_competitions(
        self,
        *,
        slug: str | None = None,
        priority: str = "pilot",
    ) -> list[CompetitionDef]:
        from app.data.competitions import COMPETITIONS

        if slug:
            comp = competition_by_slug(slug)
            return [comp] if comp and (comp.source or {}).get("type") == "api_football" else []

        pilot = set(pilot_slugs())
        out: list[CompetitionDef] = []
        for comp in COMPETITIONS:
            if (comp.source or {}).get("type") != "api_football":
                continue
            if priority == "pilot" and comp.slug not in pilot:
                continue
            out.append(comp)
        return sorted(out, key=lambda c: c.sort_order)

    def _process_competition(
        self,
        client: ApiFootballClient,
        comp: CompetitionDef,
        tournament: Tournament,
        *,
        season: int,
        budget_limit: int,
        reserve: int,
        force_step: str | None,
    ) -> dict:
        source = comp.source or {}
        league_id = int(source["league_id"])
        squad_scope = source.get("squad_scope", "league")
        state = self._backfill_state(tournament)
        if state.get("status") == "complete" and not force_step:
            return {"steps": []}

        state["status"] = "in_progress"
        self._save_state(tournament, league_id, season, state)

        steps: list[dict] = []
        team_map: dict[int, TournamentTeam] = self._load_team_map(tournament)

        for step in STEPS:
            if force_step and step != force_step:
                continue
            if step in (state.get("completed_steps") or []) and not force_step:
                continue
            if client.request_count >= budget_limit:
                break

            if step == "fetch_league":
                if not self._try_budget(client, budget_limit, reserve):
                    break
                row = client.fetch_league(league_id=league_id, season=season)
                if row:
                    league = row.get("league") or {}
                    tournament.logo_url = league.get("logo") or tournament.logo_url
                    tournament.name = league.get("name") or tournament.name
                self._mark_step_done(state, "fetch_league")
                steps.append({"slug": comp.slug, "step": "fetch_league"})

            elif step == "fetch_teams":
                if not self._try_budget(client, budget_limit, reserve):
                    break
                rows = client.fetch_teams(league_id=league_id, season=season)
                names: list[str] = []
                api_ids: list[int] = []
                for row in rows:
                    api_team = row.get("team") or {}
                    api_id = api_team.get("id")
                    name = (api_team.get("name") or "").strip()
                    if not name or api_id is None:
                        continue
                    team = self._ensure_club(tournament, name, team_map)
                    team.crest_url = api_team.get("logo") or team.crest_url
                    team.data_sources = {
                        **(team.data_sources or {}),
                        "api_football_team_id": int(api_id),
                    }
                    team_map[int(api_id)] = team
                    names.append(name)
                    api_ids.append(int(api_id))
                db.session.flush()
                pending = self._squads_pending(api_ids, squad_scope, comp)
                state["squads_pending"] = pending
                state["squads_done"] = state.get("squads_done") or []
                self._mark_step_done(state, "fetch_teams")
                steps.append({"slug": comp.slug, "step": "fetch_teams", "teams": len(names)})

            elif step == "fetch_fixtures":
                page = int(state.get("fixtures_page") or 1)
                total_pages = state.get("fixtures_total_pages")
                while client.request_count < budget_limit:
                    if not self._try_budget(client, budget_limit, reserve):
                        break
                    batch, current, total = client.fetch_fixtures_page(
                        league_id=league_id,
                        season=season,
                        page=page,
                    )
                    state["fixtures_total_pages"] = total
                    matches = 0
                    for row in batch:
                        parsed = parse_api_fixture(row)
                        if not parsed:
                            continue
                        home = team_map.get(parsed.home_api_team_id or -1)
                        away = team_map.get(parsed.away_api_team_id or -1)
                        if not home:
                            home = self._ensure_club(tournament, parsed.home_name, team_map)
                        if not away:
                            away = self._ensure_club(tournament, parsed.away_name, team_map)
                        if parsed.home_api_team_id:
                            home.data_sources = {
                                **(home.data_sources or {}),
                                "api_football_team_id": parsed.home_api_team_id,
                            }
                            team_map[parsed.home_api_team_id] = home
                        if parsed.away_api_team_id:
                            away.data_sources = {
                                **(away.data_sources or {}),
                                "api_football_team_id": parsed.away_api_team_id,
                            }
                            team_map[parsed.away_api_team_id] = away
                        self.match_upsert.upsert_from_api_football(
                            tournament,
                            parsed,
                            team1=home,
                            team2=away,
                            team1_name=parsed.home_name,
                            team2_name=parsed.away_name,
                        )
                        matches += 1
                    steps.append(
                        {
                            "slug": comp.slug,
                            "step": "fetch_fixtures",
                            "page": current,
                            "matches": matches,
                        }
                    )
                    if current >= total:
                        state["fixtures_page"] = total
                        self._mark_step_done(state, "fetch_fixtures")
                        break
                    page = current + 1
                    state["fixtures_page"] = page
                    self._save_state(tournament, league_id, season, state)
                    db.session.flush()
                if "fetch_fixtures" not in (state.get("completed_steps") or []):
                    break

            elif step == "fetch_squads":
                pending: list[int] = list(state.get("squads_pending") or [])
                done: list[int] = list(state.get("squads_done") or [])
                players = 0
                while pending and client.request_count < budget_limit:
                    if not self._try_budget(client, budget_limit, reserve):
                        break
                    api_team_id = pending[0]
                    team = team_map.get(api_team_id)
                    if not team:
                        pending.pop(0)
                        done.append(api_team_id)
                        continue
                    squad = client.fetch_team_squad(team_id=api_team_id)
                    for member in squad:
                        dto = player_dto_from_squad_member(member, team, source=SOURCE)
                        players += self.ingestion._upsert_player(dto, team, fill_only=False)
                    pending.pop(0)
                    done.append(api_team_id)
                    steps.append(
                        {
                            "slug": comp.slug,
                            "step": "fetch_squads",
                            "team_id": api_team_id,
                            "players": len(squad),
                        }
                    )
                state["squads_pending"] = pending
                state["squads_done"] = done
                if not pending:
                    self._mark_step_done(state, "fetch_squads")
                break

        if self._pending_steps(state):
            state["status"] = "in_progress"
        else:
            state["status"] = "complete"
            tournament.synced_at = datetime.utcnow()

        state["last_run_at"] = datetime.now(timezone.utc).isoformat()
        state["requests_used_last_run"] = client.request_count
        self._save_state(tournament, league_id, season, state)
        db.session.flush()
        return {"steps": steps}

    def _squads_pending(
        self,
        api_ids: list[int],
        squad_scope: str,
        comp: CompetitionDef,
    ) -> list[int]:
        if squad_scope == "all_teams":
            return api_ids
        if squad_scope == "league_teams":
            allowed = self._tier1_api_team_ids()
            return [i for i in api_ids if i in allowed]
        return api_ids

    def _tier1_api_team_ids(self) -> set[int]:
        ids: set[int] = set()
        teams = db.session.scalars(
            select(TournamentTeam)
            .join(TournamentTeam.tournament)
            .where(Tournament.kind == "league", Tournament.tier == 1)
        ).all()
        for team in teams:
            api_id = (team.data_sources or {}).get("api_football_team_id")
            if api_id is not None:
                ids.add(int(api_id))
        return ids

    @staticmethod
    def _try_budget(client: ApiFootballClient, budget_limit: int, reserve: int) -> bool:
        if client.request_count >= budget_limit:
            return False
        try:
            client.ensure_budget(1, reserve=reserve)
            return True
        except ApiFootballBudgetError:
            return False

    @staticmethod
    def _backfill_state(tournament: Tournament | None) -> dict:
        if not tournament:
            return {"status": "pending", "completed_steps": []}
        sources = tournament.data_sources or {}
        return dict(sources.get("backfill") or {"status": "pending", "completed_steps": []})

    @staticmethod
    def _save_state(
        tournament: Tournament,
        league_id: int,
        season: int,
        state: dict,
    ) -> None:
        sources = dict(tournament.data_sources or {})
        sources["api_football"] = {"league_id": league_id, "season": season}
        sources["backfill"] = state
        tournament.data_sources = sources

    @staticmethod
    def _mark_step_done(state: dict, step: str) -> None:
        completed = list(state.get("completed_steps") or [])
        if step not in completed:
            completed.append(step)
        state["completed_steps"] = completed

    @staticmethod
    def _pending_steps(state: dict) -> list[str]:
        done = set(state.get("completed_steps") or [])
        pending = [s for s in STEPS if s not in done]
        if "fetch_squads" in done:
            return []
        if state.get("squads_pending"):
            if "fetch_squads" not in done:
                return ["fetch_squads"]
        return pending

    def _load_team_map(self, tournament: Tournament) -> dict[int, TournamentTeam]:
        mapping: dict[int, TournamentTeam] = {}
        teams = db.session.scalars(
            select(TournamentTeam).where(TournamentTeam.tournament_id == tournament.id)
        ).all()
        for team in teams:
            api_id = (team.data_sources or {}).get("api_football_team_id")
            if api_id is not None:
                mapping[int(api_id)] = team
        return mapping

    def _ensure_club(
        self,
        tournament: Tournament,
        name: str,
        team_map: dict[int, TournamentTeam],
    ) -> TournamentTeam:
        for team in team_map.values():
            if team.display_name == name:
                return team
        team = TournamentTeam(
            tournament_id=tournament.id,
            nation_id=None,
            display_name=name,
            short_code=self._short_code(name),
        )
        db.session.add(team)
        db.session.flush()
        return team

    @staticmethod
    def _short_code(name: str) -> str:
        cleaned = re.sub(r"\b(FC|CF|AFC|SC|AC|SD|CD|UD|RC)\b", "", name, flags=re.IGNORECASE)
        letters = re.sub(r"[^A-Za-z]", "", cleaned).upper()
        return (letters[:3] or name[:3].upper()).ljust(3, "X")[:3]

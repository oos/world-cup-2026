import re
from datetime import date, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.ingestion.goal_enrichment import GoalEnrichmentService, enrich_match_goals
from app.ingestion.known_scores import apply_known_score, known_score_for_teams
from app.ingestion.world_cup_years import (
    CURRENT_WORLD_CUP_YEAR,
    HISTORICAL_WORLD_CUP_YEARS,
    WORLD_CUP_FORMATS,
)
from app.models.match import Match
from app.models.nation import Nation
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.services.nation_service import NationService

OPENFOOTBALL_BASE = "https://raw.githubusercontent.com/openfootball/worldcup.json/master"


class HistoryService:
    def __init__(self) -> None:
        self.nation_service = NationService()

    def sync_history(self) -> dict:
        goal_service = GoalEnrichmentService()
        goals = goal_service.load_goals()
        goal_service.prepare(goals)

        tournament_count = 0
        match_count = 0

        for year in [*HISTORICAL_WORLD_CUP_YEARS, CURRENT_WORLD_CUP_YEAR]:
            tournament = self._ensure_tournament(year)
            year_matches = self._fetch_year(year)
            for payload in year_matches:
                enriched = apply_known_score(enrich_match_goals(payload, goal_service=goal_service))
                self._upsert_match(tournament, enriched)
                match_count += 1
            tournament.synced_at = datetime.utcnow()
            tournament_count += 1

        db.session.commit()
        return {
            "tournaments": tournament_count,
            "matches": match_count,
            "goal_count": goal_service.goal_count(),
        }

    def list_tournaments(self) -> list[dict]:
        tournaments = db.session.scalars(
            select(Tournament).order_by(Tournament.year.desc())
        ).all()
        if not tournaments:
            return []

        return [
            {
                "year": tournament.year,
                "name": tournament.name,
                "match_count": db.session.scalar(
                    select(db.func.count(Match.id)).where(Match.tournament_id == tournament.id)
                )
                or 0,
            }
            for tournament in tournaments
        ]

    def list_matches(
        self,
        year: int | None = None,
        round_name: str | None = None,
        group: str | None = None,
    ) -> list[dict]:
        stmt = (
            select(Match)
            .join(Match.tournament)
            .options(
                joinedload(Match.team1).joinedload(TournamentTeam.nation),
                joinedload(Match.team2).joinedload(TournamentTeam.nation),
                joinedload(Match.stadium),
            )
            .order_by(Tournament.year, Match.match_date, Match.match_number)
        )
        if year is not None:
            stmt = stmt.where(Tournament.year == year)
        if round_name:
            stmt = stmt.where(Match.round == round_name)
        if group:
            stmt = stmt.where(Match.group_name == group)

        matches = db.session.scalars(stmt).unique().all()
        return [self._match_to_dict(match) for match in matches]

    def get_tournament_format(self, year: int) -> dict[str, int]:
        static = WORLD_CUP_FORMATS.get(year, {})
        computed_teams = len(self.list_teams(year))
        return {
            "team_count": static.get("teams", computed_teams),
            "group_count": static.get("groups", 0),
        }

    def list_teams(self, year: int) -> list[dict]:
        matches = self.list_matches(year=year)
        teams: dict[str, dict] = {}
        for match in matches:
            for team_name in (match["team1"], match["team2"]):
                if not team_name:
                    continue
                if team_name not in teams:
                    teams[team_name] = {"name": team_name, "group": match.get("group")}
                elif match.get("group") and not teams[team_name]["group"]:
                    teams[team_name]["group"] = match["group"]
        return sorted(teams.values(), key=lambda t: t["name"])

    def build_match_key(self, match: dict) -> str:
        teams = sorted([match.get("team1", ""), match.get("team2", "")])
        match_date = match.get("date") or "unknown"
        return f"{match_date}-{self._team_slug(teams[0])}-vs-{self._team_slug(teams[1])}"

    def get_match_detail(self, year: int, match_key: str) -> dict | None:
        match = db.session.scalars(
            select(Match)
            .join(Match.tournament)
            .options(
                joinedload(Match.team1).joinedload(TournamentTeam.nation),
                joinedload(Match.team2).joinedload(TournamentTeam.nation),
            )
            .where(Tournament.year == year, Match.match_key == match_key)
        ).first()
        if match is None:
            return None
        return self._format_match_detail(self._match_to_dict(match))

    def _ensure_tournament(self, year: int) -> Tournament:
        external_key = f"world-cup-{year}"
        tournament = db.session.scalars(
            select(Tournament).where(Tournament.external_key == external_key)
        ).first()
        if tournament is None:
            tournament = Tournament(
                name=f"FIFA World Cup {year}",
                year=year,
                external_key=external_key,
            )
            db.session.add(tournament)
            db.session.flush()
        return tournament

    def _upsert_match(self, tournament: Tournament, payload: dict) -> Match:
        team1 = self.nation_service.ensure_tournament_team(
            tournament,
            payload.get("team1", ""),
            group_name=payload.get("group"),
        )
        team2 = self.nation_service.ensure_tournament_team(
            tournament,
            payload.get("team2", ""),
            group_name=payload.get("group"),
        )
        match_key = self.build_match_key(payload)
        match_date = self._parse_date(payload.get("date"))

        existing = db.session.scalars(
            select(Match).where(Match.tournament_id == tournament.id, Match.match_key == match_key)
        ).first()
        if existing is None and payload.get("match_number"):
            existing = db.session.scalars(
                select(Match).where(
                    Match.tournament_id == tournament.id,
                    Match.match_number == payload.get("match_number"),
                )
            ).first()

        if existing is None:
            existing = Match(tournament_id=tournament.id)
            db.session.add(existing)

        existing.round = payload.get("round") or existing.round
        existing.match_number = payload.get("match_number")
        existing.match_date = match_date
        existing.match_time = payload.get("time")
        existing.group_name = payload.get("group")
        existing.stadium_name = payload.get("stadium")
        existing.score = payload.get("score")
        existing.goals1 = payload.get("goals1") or []
        existing.goals2 = payload.get("goals2") or []
        existing.match_key = match_key
        existing.team1_id = team1.id if team1 else None
        existing.team2_id = team2.id if team2 else None
        db.session.flush()
        return existing

    def _match_to_dict(self, match: Match) -> dict:
        team1_name = match.team1.name if match.team1 else ""
        team2_name = match.team2.name if match.team2 else ""
        stadium = match.stadium_name or (match.stadium.name if match.stadium else None)
        return {
            "year": match.tournament.year if match.tournament else None,
            "round": match.round or "",
            "match_number": match.match_number,
            "date": match.match_date.isoformat() if match.match_date else None,
            "time": match.match_time,
            "group": match.group_name,
            "team1": team1_name,
            "team2": team2_name,
            "team1_flag_iso": match.team1.flag_iso if match.team1 else None,
            "team2_flag_iso": match.team2.flag_iso if match.team2 else None,
            "stadium": stadium,
            "score": match.score,
            "goals1": match.goals1 or [],
            "goals2": match.goals2 or [],
            "match_key": match.match_key,
        }

    def _team_slug(self, name: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
        return slug or "team"

    @staticmethod
    def _parse_date(value: str | None) -> date | None:
        if not value:
            return None
        return date.fromisoformat(value)

    def _format_goal_events(self, goals: list | None) -> list[dict]:
        if not goals:
            return []

        events = []
        for goal in goals:
            name = goal.get("name") or "Unknown"
            minute = goal.get("minute")
            tags: list[str] = []
            if goal.get("penalty"):
                tags.append("pen")
            if goal.get("owngoal"):
                tags.append("OG")

            label = f"{name} ({minute}')" if minute is not None else name
            if tags:
                label = f"{label} [{', '.join(tags)}]"

            events.append({"name": name, "minute": minute, "label": label})
        return events

    def _score_pair(self, values: list | None) -> dict[str, int] | None:
        if not values or len(values) < 2:
            return None
        return {"team1": values[0], "team2": values[1]}

    def _format_match_detail(self, match: dict) -> dict:
        score = match.get("score") or {}
        ft = score.get("ft") or [0, 0]
        et = score.get("et")
        pens = score.get("pens") or score.get("p")
        team1_goals_raw = match.get("goals1") or []
        team2_goals_raw = match.get("goals2") or []

        went_to_extra_time = bool(et and len(et) >= 2)
        if went_to_extra_time:
            team1_score, team2_score = et[0], et[1]
        else:
            team1_score, team2_score = ft[0], ft[1]

        penalty_score = None
        if pens and len(pens) >= 2:
            penalty_score = {"team1": pens[0], "team2": pens[1]}

        return {
            **match,
            "match_key": match.get("match_key") or self.build_match_key(match),
            "team1_score": team1_score,
            "team2_score": team2_score,
            "went_to_extra_time": went_to_extra_time,
            "penalty_score": penalty_score,
            "half_time_score": self._score_pair(score.get("ht")),
            "full_time_score": self._score_pair(ft),
            "extra_time_score": self._score_pair(et),
            "team1_goals": self._format_goal_events(team1_goals_raw),
            "team2_goals": self._format_goal_events(team2_goals_raw),
            "timeline": self._build_match_timeline(match, team1_goals_raw, team2_goals_raw),
        }

    def _build_match_timeline(
        self,
        match: dict,
        team1_goals_raw: list | None,
        team2_goals_raw: list | None,
    ) -> list[dict]:
        score = match.get("score") or {}
        team1 = match.get("team1", "")
        team2 = match.get("team2", "")
        events: list[dict] = [{"type": "kickoff", "minute": 0, "label": "Kick-off"}]

        def append_goal(goal: dict, for_team1: bool) -> None:
            minute = goal.get("minute")
            name = goal.get("name") or "Unknown"
            tags: list[str] = []
            if goal.get("penalty"):
                tags.append("pen")
            if goal.get("owngoal"):
                tags.append("OG")
            label = f"{name} ({minute}')" if minute is not None else name
            if tags:
                label = f"{label} [{', '.join(tags)}]"
            events.append(
                {
                    "type": "goal",
                    "minute": minute if minute is not None else 0,
                    "side": "team" if for_team1 else "opponent",
                    "team_name": team1 if for_team1 else team2,
                    "scorer": name,
                    "label": label,
                    "penalty": bool(goal.get("penalty")),
                    "own_goal": bool(goal.get("owngoal")),
                }
            )

        for goal in team1_goals_raw or []:
            append_goal(goal, True)
        for goal in team2_goals_raw or []:
            append_goal(goal, False)

        half_time_score = self._score_pair(score.get("ht"))
        if half_time_score:
            events.append(
                {
                    "type": "half_time",
                    "minute": 45,
                    "label": "Half time",
                    "team_score": half_time_score["team1"],
                    "opponent_score": half_time_score["team2"],
                }
            )

        full_time_score = self._score_pair(score.get("ft")) or {"team1": 0, "team2": 0}
        events.append(
            {
                "type": "full_time",
                "minute": 90,
                "label": "Full time",
                "team_score": full_time_score["team1"],
                "opponent_score": full_time_score["team2"],
            }
        )

        extra_time_score = self._score_pair(score.get("et"))
        if extra_time_score:
            events.append(
                {
                    "type": "extra_time_end",
                    "minute": 120,
                    "label": "End of extra time",
                    "team_score": extra_time_score["team1"],
                    "opponent_score": extra_time_score["team2"],
                }
            )

        pens = score.get("pens") or score.get("p")
        penalty_score = self._score_pair(pens)
        if penalty_score:
            events.append(
                {
                    "type": "penalties",
                    "minute": 120,
                    "label": "Penalty shoot-out",
                    "team_score": penalty_score["team1"],
                    "opponent_score": penalty_score["team2"],
                }
            )

        type_order = {
            "kickoff": 0,
            "goal": 1,
            "half_time": 2,
            "full_time": 3,
            "extra_time_end": 4,
            "penalties": 5,
        }
        events.sort(
            key=lambda event: (event.get("minute", 0), type_order.get(event["type"], 9))
        )
        return events

    def _fetch_year(self, year: int) -> list[dict]:
        url = f"{OPENFOOTBALL_BASE}/{year}/worldcup.json"
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url)
            response.raise_for_status()
            data = response.json()

        matches = []
        for item in data.get("matches", []):
            team1 = item.get("team1", "")
            team2 = item.get("team2", "")
            if self._is_placeholder_team(team1) or self._is_placeholder_team(team2):
                continue
            matches.append(
                {
                    "year": year,
                    "round": item.get("round", ""),
                    "match_number": item.get("num"),
                    "date": item.get("date"),
                    "time": item.get("time"),
                    "group": item.get("group"),
                    "team1": team1,
                    "team2": team2,
                    "stadium": item.get("ground"),
                    "score": item.get("score"),
                    "goals1": item.get("goals1") or [],
                    "goals2": item.get("goals2") or [],
                }
            )
        return matches

    @staticmethod
    def _is_placeholder_team(name: str) -> bool:
        if not name:
            return True
        if name[0].isdigit():
            return True
        if name.startswith(("W", "L")) and len(name) <= 4:
            return True
        return "/" in name

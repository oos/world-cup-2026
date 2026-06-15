from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.ingestion import IngestionService
from app.ingestion.espn_commentary_client import EspnCommentaryClient
from app.ingestion.team_mapper import name_to_fifa
from app.models.match import Match
from app.models.tournament import Tournament
from app.utils.match_time import parse_match_kickoff

logger = logging.getLogger(__name__)

LIVE_PRE_MATCH_MINUTES = 15
LIVE_POST_MATCH_MINUTES = 135
LIVE_GRACE_AFTER_WINDOW_MINUTES = 120
CATCHUP_LOOKBACK_DAYS = 7


class LiveScoreService:
    USER_AGENT = "WorldCup2026App/1.0 (https://github.com/oos/world-cup-2026; +live-score-sync)"

    def __init__(self, delay: float = 0.0) -> None:
        self.client = EspnCommentaryClient(self.USER_AGENT, delay=delay)

    def close(self) -> None:
        self.client.close()

    def sync(self) -> dict:
        now = datetime.now(timezone.utc)
        live_candidates, catchup_candidates = self._collect_candidates(now)
        candidates = self._union_candidates(live_candidates, catchup_candidates)

        if not candidates:
            return {
                "skipped": True,
                "reason": "no_candidates",
                "updated": 0,
                "live_candidates": 0,
                "catchup_candidates": 0,
            }

        candidate_ids = {match.id for match in candidates}
        scoreboard_dates = sorted(
            {
                match.match_date.strftime("%Y%m%d")
                for match in candidates
                if match.match_date
            }
        )

        updated = 0
        checked_events = 0
        for date_key in scoreboard_dates:
            for event in self.client.fetch_scoreboard(date_key):
                parsed = self.client.parse_scoreboard_event(event)
                if not parsed:
                    continue
                checked_events += 1
                match = self._find_db_match(
                    parsed.get("match_date"),
                    parsed.get("home_team"),
                    parsed.get("away_team"),
                )
                if not match or match.id not in candidate_ids:
                    continue
                score = self._score_from_espn(match, parsed)
                if score and self._should_update(match, score, parsed):
                    match.score = score
                    updated += 1

        db.session.commit()

        known_scores_updated = 0
        if catchup_candidates and updated == 0:
            known_scores_updated = IngestionService().apply_known_scores().get("updated", 0)

        return {
            "skipped": False,
            "updated": updated,
            "known_scores_updated": known_scores_updated,
            "live_candidates": len(live_candidates),
            "catchup_candidates": len(catchup_candidates),
            "candidates": len(candidates),
            "checked_events": checked_events,
        }

    def _current_tournament_matches(self) -> list[Match]:
        return list(
            db.session.scalars(
                select(Match)
                .join(Match.tournament)
                .where(Tournament.year == CURRENT_TOURNAMENT_YEAR)
                .order_by(Match.match_date, Match.match_time, Match.id)
            ).all()
        )

    def _collect_candidates(self, now: datetime) -> tuple[list[Match], list[Match]]:
        live_candidates: list[Match] = []
        catchup_candidates: list[Match] = []

        for match in self._current_tournament_matches():
            if self._match_needs_updates(match, now):
                live_candidates.append(match)
            elif self._match_needs_catchup(match, now):
                catchup_candidates.append(match)

        return live_candidates, catchup_candidates

    @staticmethod
    def _union_candidates(
        live_candidates: list[Match],
        catchup_candidates: list[Match],
    ) -> list[Match]:
        merged: dict[int, Match] = {match.id: match for match in live_candidates}
        for match in catchup_candidates:
            merged.setdefault(match.id, match)
        return list(merged.values())

    def _match_needs_catchup(self, match: Match, now: datetime) -> bool:
        if not self._match_missing_final_score(match):
            return False

        kickoff = parse_match_kickoff(match.match_date, match.match_time)
        if not kickoff or not match.team1 or not match.team2:
            return False

        if kickoff >= now:
            return False

        cutoff = now - timedelta(days=CATCHUP_LOOKBACK_DAYS)
        return kickoff >= cutoff

    @staticmethod
    def _match_missing_final_score(match: Match) -> bool:
        if not isinstance(match.score, dict):
            return True
        return match.score.get("ft") is None

    def _match_needs_updates(self, match: Match, now: datetime) -> bool:
        kickoff = parse_match_kickoff(match.match_date, match.match_time)
        if not kickoff or not match.team1 or not match.team2:
            return False

        window_start = kickoff - timedelta(minutes=LIVE_PRE_MATCH_MINUTES)
        window_end = kickoff + timedelta(minutes=LIVE_POST_MATCH_MINUTES)
        grace_end = window_end + timedelta(minutes=LIVE_GRACE_AFTER_WINDOW_MINUTES)

        if now < window_start or now > grace_end:
            return False

        if match.score and isinstance(match.score, dict) and match.score.get("ft"):
            return now <= window_end + timedelta(minutes=30)

        return True

    @staticmethod
    def _should_update(match: Match, score: dict, parsed: dict) -> bool:
        current_ft = (match.score or {}).get("ft") if isinstance(match.score, dict) else None
        new_ft = score.get("ft")
        if current_ft == new_ft:
            return False

        status_state = parsed.get("status_state")
        status_completed = parsed.get("status_completed")
        if status_state == "pre" and current_ft is None:
            return False

        if status_state in {"in", "post"} or status_completed:
            return True

        return current_ft is None and new_ft is not None

    @staticmethod
    def _score_from_espn(match: Match, parsed: dict) -> dict | None:
        home_score = parsed.get("home_score")
        away_score = parsed.get("away_score")
        if home_score is None or away_score is None:
            return None

        home_team = parsed.get("home_team")
        away_team = parsed.get("away_team")
        if not home_team or not away_team or not match.team1 or not match.team2:
            return None

        team1_code = (name_to_fifa(match.team1.name) or match.team1.name).strip().lower()
        team2_code = (name_to_fifa(match.team2.name) or match.team2.name).strip().lower()
        home_code = (name_to_fifa(home_team) or home_team).strip().lower()
        away_code = (name_to_fifa(away_team) or away_team).strip().lower()

        if team1_code == home_code and team2_code == away_code:
            return {"ft": [home_score, away_score]}
        if team1_code == away_code and team2_code == home_code:
            return {"ft": [away_score, home_score]}
        return None

    def _find_db_match(
        self,
        match_date,
        home_team: str | None,
        away_team: str | None,
    ) -> Match | None:
        if not match_date or not home_team or not away_team:
            return None

        target = self._team_codes(home_team, away_team)
        for match in db.session.scalars(select(Match).where(Match.match_date == match_date)).all():
            if not match.team1 or not match.team2:
                continue
            codes = self._team_codes(match.team1.name, match.team2.name)
            if codes == target:
                return match
        return None

    @staticmethod
    def _team_codes(team_a: str, team_b: str) -> frozenset[str]:
        def code(name: str) -> str:
            return (name_to_fifa(name) or name or "").strip().lower()

        return frozenset({code(team_a), code(team_b)})

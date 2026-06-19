from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.extensions import db
from app.ingestion.espn_commentary_client import EspnCommentaryClient
from app.ingestion.score_merge import apply_score_update
from app.ingestion.score_providers.api_football import (
    ApiFootballScoreProvider,
    parse_fixture_score,
)
from app.ingestion.score_providers.espn import EspnScoreProvider
from app.models.match import Match
from app.models.tournament import Tournament
from app.utils.match_time import parse_match_kickoff

logger = logging.getLogger(__name__)

_CLUB_SUFFIXES = (" fc", " cf", " afc", " sc", " ac", " sd", " cd", " ud", " rc", " bc")


def _normalize_club_name(name: str | None) -> str:
    text = (name or "").strip().lower()
    for suffix in _CLUB_SUFFIXES:
        if text.endswith(suffix):
            text = text[: -len(suffix)]
    text = text.replace(".", "").replace("-", " ").replace("&", "and")
    return " ".join(text.split())


LIVE_PRE_MATCH_MINUTES = 15
LIVE_POST_MATCH_MINUTES = 135
LIVE_GRACE_AFTER_WINDOW_MINUTES = 120
CATCHUP_LOOKBACK_DAYS = 7


class ScoreSyncService:
    USER_AGENT = "WorldCup2026App/1.0 (https://github.com/oos/world-cup-2026; +live-score-sync)"

    def __init__(self, delay: float = 0.0) -> None:
        self.espn_client = EspnCommentaryClient(self.USER_AGENT, delay=delay)
        self.espn = EspnScoreProvider(self.espn_client)
        self._api_football: ApiFootballScoreProvider | None = None

    @property
    def api_football(self) -> ApiFootballScoreProvider | None:
        if self._api_football is None:
            self._api_football = ApiFootballScoreProvider.from_app_config()
        return self._api_football

    def close(self) -> None:
        self.espn_client.close()
        if self._api_football is not None:
            self._api_football.client.close()

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

        if self.api_football:
            try:
                self.api_football.link_fixture_ids(candidates)
            except Exception as exc:
                logger.warning("API-Football fixture linking failed: %s", exc)

        candidate_ids = {match.id for match in candidates}
        candidate_by_id = {match.id: match for match in candidates}
        updated = 0
        espn_checked = 0
        api_football_checked = 0

        scoreboard_dates = self._scoreboard_date_keys(candidates)

        for date_key in scoreboard_dates:
            for parsed, update in self.espn.fetch_for_date(date_key):
                espn_checked += 1
                match = self._find_db_match(
                    parsed.get("match_date"),
                    parsed.get("home_team"),
                    parsed.get("away_team"),
                )
                if not match or match.id not in candidate_ids:
                    continue
                score = EspnScoreProvider.map_score_for_match(match, parsed)
                goals1, goals2 = [], []
                if parsed.get("status_state") in {"in", "post"} or parsed.get("status_completed"):
                    goals1, goals2 = self.espn.fetch_goals_for_match(parsed, match)
                should_apply = bool(
                    score and EspnScoreProvider.should_apply(match, update, parsed)
                )
                if not should_apply and not goals1 and not goals2:
                    continue
                if apply_score_update(
                    match,
                    score if should_apply else match.score,
                    source="espn",
                    status=parsed.get("status_state"),
                    goals1=goals1 or None,
                    goals2=goals2 or None,
                ):
                    updated += 1

        if self.api_football:
            try:
                for row in self.api_football.fetch_live():
                    api_football_checked += 1
                    fixture = row.get("fixture") or {}
                    fixture_date = (fixture.get("date") or "")[:10]
                    teams = row.get("teams") or {}
                    home = (teams.get("home") or {}).get("name")
                    away = (teams.get("away") or {}).get("name")
                    match = self._find_db_match(
                        date.fromisoformat(fixture_date) if fixture_date else None,
                        home,
                        away,
                    )
                    if not match or match.id not in candidate_ids:
                        continue
                    update = parse_fixture_score(row, match)
                    if not update:
                        continue
                    update = self.api_football.enrich_update(update, row, match)
                    if apply_score_update(
                        match,
                        update.score,
                        source=update.source,
                        status=update.status,
                        goals1=update.goals1,
                        goals2=update.goals2,
                    ):
                        updated += 1
            except Exception as exc:
                logger.warning("API-Football live fetch failed: %s", exc)

            for match in candidates:
                if isinstance(match.score, dict) and match.score.get("ft"):
                    continue
                try:
                    update = self.api_football.fetch_for_match(match)
                    api_football_checked += 1
                    if update and apply_score_update(
                        match,
                        update.score,
                        source=update.source,
                        status=update.status,
                        goals1=update.goals1,
                        goals2=update.goals2,
                    ):
                        updated += 1
                except Exception as exc:
                    logger.warning("API-Football match fetch failed for %s: %s", match.id, exc)

        db.session.commit()

        known_scores_updated = 0
        if catchup_candidates and updated == 0:
            from app.ingestion import IngestionService

            known_scores_updated = IngestionService().apply_known_scores().get("updated", 0)

        return {
            "skipped": False,
            "updated": updated,
            "known_scores_updated": known_scores_updated,
            "live_candidates": len(live_candidates),
            "catchup_candidates": len(catchup_candidates),
            "candidates": len(candidates),
            "espn_checked": espn_checked,
            "api_football_checked": api_football_checked,
            "api_football_enabled": self.api_football is not None,
        }

    def _current_tournament_matches(self) -> list[Match]:
        from app.data.competitions import competition_slugs

        return list(
            db.session.scalars(
                select(Match)
                .join(Match.tournament)
                .where(Tournament.external_key.in_(competition_slugs()))
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
            elif self._match_needs_goal_assist_backfill(match, now):
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

    @staticmethod
    def _match_needs_goal_assist_backfill(match: Match, now: datetime) -> bool:
        if not isinstance(match.score, dict) or not match.score.get("ft"):
            return False

        goals = (match.goals1 or []) + (match.goals2 or [])
        non_own = [
            goal for goal in goals if isinstance(goal, dict) and not goal.get("owngoal")
        ]
        if not non_own:
            return False
        if any(goal.get("assist") for goal in non_own):
            return False

        kickoff = parse_match_kickoff(match.match_date, match.match_time)
        if not kickoff or kickoff >= now or not match.team1 or not match.team2:
            return False

        return True

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

    def _find_db_match(
        self,
        match_date,
        home_team: str | None,
        away_team: str | None,
    ) -> Match | None:
        if not home_team or not away_team:
            return None

        target = EspnScoreProvider._team_codes(home_team, away_team)
        target_clubs = self._club_name_set(home_team, away_team)

        for search_date in self._dates_to_search(match_date):
            for match in db.session.scalars(
                select(Match).where(Match.match_date == search_date)
            ).all():
                if not match.team1 or not match.team2:
                    continue
                codes = EspnScoreProvider._team_codes(match.team1.name, match.team2.name)
                if codes == target:
                    return match
                # Club competitions: fall back to normalized club-name matching since
                # clubs have no FIFA codes and source names vary (e.g. "... FC").
                if match.team1.is_club or match.team2.is_club:
                    if self._club_name_set(match.team1.name, match.team2.name) == target_clubs:
                        return match
        return None

    @staticmethod
    def _dates_to_search(match_date: date | None) -> list[date]:
        if not match_date:
            return []
        return [match_date, match_date - timedelta(days=1), match_date + timedelta(days=1)]

    @staticmethod
    def _scoreboard_date_keys(candidates: list[Match]) -> list[str]:
        keys: set[str] = set()
        for match in candidates:
            if not match.match_date:
                continue
            for offset in (0, -1, 1):
                keys.add((match.match_date + timedelta(days=offset)).strftime("%Y%m%d"))
        return sorted(keys)

    @staticmethod
    def _club_name_set(team_a: str, team_b: str) -> frozenset[str]:
        return frozenset({_normalize_club_name(team_a), _normalize_club_name(team_b)})


class LiveScoreService(ScoreSyncService):
    """Backward-compatible alias for the live score worker and tests."""

    @staticmethod
    def _score_from_espn(match: Match, parsed: dict) -> dict | None:
        return EspnScoreProvider.map_score_for_match(match, parsed)

    @staticmethod
    def _should_update(match: Match, score: dict, parsed: dict) -> bool:
        from app.ingestion.score_providers.base import ScoreUpdate

        update = ScoreUpdate(score=score, source="espn", status=parsed.get("status_state"))
        return EspnScoreProvider.should_apply(match, update, parsed)

    @staticmethod
    def _team_codes(team_a: str, team_b: str) -> frozenset[str]:
        return EspnScoreProvider._team_codes(team_a, team_b)

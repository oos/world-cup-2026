from __future__ import annotations

from app.ingestion.espn_commentary_client import EspnCommentaryClient
from app.ingestion.espn_goals import parse_espn_summary_goals
from app.ingestion.live_status import attach_live_status
from app.ingestion.score_providers.base import ScoreUpdate
from app.ingestion.team_mapper import name_to_fifa
from app.models.match import Match


class EspnScoreProvider:
    def __init__(self, client: EspnCommentaryClient) -> None:
        self.client = client

    def fetch_for_date(self, date_key: str) -> list[tuple[dict, ScoreUpdate]]:
        results: list[tuple[dict, ScoreUpdate]] = []
        for event in self.client.fetch_scoreboard(date_key):
            parsed = self.client.parse_scoreboard_event(event)
            if not parsed:
                continue
            score = self._score_from_event(parsed)
            if not score:
                continue
            results.append(
                (
                    parsed,
                    ScoreUpdate(
                        score=score,
                        source="espn",
                        status=parsed.get("status_state"),
                    ),
                )
            )
        return results

    @staticmethod
    def match_db_row(parsed: dict, match: Match) -> bool:
        home_team = parsed.get("home_team")
        away_team = parsed.get("away_team")
        if not home_team or not away_team or not match.team1 or not match.team2:
            return False
        return EspnScoreProvider._team_codes(
            match.team1.name, match.team2.name
        ) == EspnScoreProvider._team_codes(home_team, away_team)

    @staticmethod
    def should_apply(match: Match, update: ScoreUpdate, parsed: dict) -> bool:
        status_state = parsed.get("status_state")
        status_completed = parsed.get("status_completed")
        if status_state == "in":
            return True

        current_ft = (match.score or {}).get("ft") if isinstance(match.score, dict) else None
        new_ft = update.score.get("ft")
        if current_ft == new_ft:
            return False

        if status_state == "pre" and current_ft is None:
            return False

        if status_state == "post" or status_completed:
            return True

        return current_ft is None and new_ft is not None

    @staticmethod
    def _score_from_event(parsed: dict) -> dict | None:
        home_score = parsed.get("home_score")
        away_score = parsed.get("away_score")
        if home_score is None or away_score is None:
            return None
        score = {"ft": [home_score, away_score]}
        live_status = parsed.get("live_status")
        if live_status:
            return attach_live_status(score, live_status)
        return score

    @staticmethod
    def map_score_for_match(match: Match, parsed: dict) -> dict | None:
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
            score = {"ft": [home_score, away_score]}
        elif team1_code == away_code and team2_code == home_code:
            score = {"ft": [away_score, home_score]}
        else:
            return None

        live_status = parsed.get("live_status")
        if live_status:
            return attach_live_status(score, live_status)
        return score

    @staticmethod
    def _team_codes(team_a: str, team_b: str) -> frozenset[str]:
        def code(name: str) -> str:
            return (name_to_fifa(name) or name or "").strip().lower()

        return frozenset({code(team_a), code(team_b)})

    def fetch_goals_for_match(self, parsed: dict, match: Match) -> tuple[list[dict], list[dict]]:
        game_id = parsed.get("espn_game_id")
        if not game_id:
            return [], []
        try:
            summary = self.client.fetch_summary(str(game_id))
            return parse_espn_summary_goals(summary, match)
        except Exception:
            return [], []

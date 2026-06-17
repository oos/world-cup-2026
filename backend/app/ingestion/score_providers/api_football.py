from __future__ import annotations

from flask import current_app

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.ingestion.api_football_client import (
    WORLD_CUP_LEAGUE_ID,
    ApiFootballClient,
    link_fixture_id,
)
from app.ingestion.score_providers.base import ScoreUpdate
from app.ingestion.team_mapper import name_to_fifa
from app.models.match import Match


def parse_fixture_score(row: dict, match: Match) -> ScoreUpdate | None:
    goals = row.get("goals") or {}
    score_block = row.get("score") or {}
    home_goals = goals.get("home")
    away_goals = goals.get("away")

    if home_goals is None or away_goals is None:
        fulltime = score_block.get("fulltime") or {}
        home_goals = fulltime.get("home")
        away_goals = fulltime.get("away")

    if home_goals is None or away_goals is None:
        return None

    teams = row.get("teams") or {}
    home = teams.get("home") or {}
    away = teams.get("away") or {}
    home_code = (home.get("code") or name_to_fifa(home.get("name") or "") or "").upper()
    away_code = (away.get("code") or name_to_fifa(away.get("name") or "") or "").upper()
    team1_code = (match.team1.fifa_code if match.team1 else None) or name_to_fifa(
        match.team1.name if match.team1 else ""
    )
    team2_code = (match.team2.fifa_code if match.team2 else None) or name_to_fifa(
        match.team2.name if match.team2 else ""
    )
    if not team1_code or not team2_code:
        return None

    team1_code = team1_code.upper()
    team2_code = team2_code.upper()

    if team1_code == home_code and team2_code == away_code:
        ft = [int(home_goals), int(away_goals)]
    elif team1_code == away_code and team2_code == home_code:
        ft = [int(away_goals), int(home_goals)]
    else:
        return None

    score: dict = {"ft": ft}
    halftime = score_block.get("halftime") or {}
    if halftime.get("home") is not None and halftime.get("away") is not None:
        if team1_code == home_code:
            score["ht"] = [int(halftime["home"]), int(halftime["away"])]
        else:
            score["ht"] = [int(halftime["away"]), int(halftime["home"])]

    fixture = row.get("fixture") or {}
    status = ((fixture.get("status") or {}).get("short") or "").lower() or None

    return ScoreUpdate(score=score, source="api_football", status=status)


class ApiFootballScoreProvider:
    def __init__(self, client: ApiFootballClient, *, season: int = CURRENT_TOURNAMENT_YEAR) -> None:
        self.client = client
        self.season = season

    @classmethod
    def from_app_config(cls) -> ApiFootballScoreProvider | None:
        api_key = current_app.config.get("API_FOOTBALL_KEY") or ""
        if not api_key:
            return None
        if current_app.config.get("API_FOOTBALL_PROOF_MODE", True):
            return None
        season = int(current_app.config.get("API_FOOTBALL_SEASON", CURRENT_TOURNAMENT_YEAR))
        return cls(ApiFootballClient(api_key), season=season)

    def fetch_live(self) -> list[dict]:
        return self.client.fetch_live_fixtures()

    def fetch_for_date(self, date_iso: str) -> list[dict]:
        return self.client.fetch_fixtures_by_date(
            league_id=WORLD_CUP_LEAGUE_ID,
            season=self.season,
            date=date_iso,
        )

    def fetch_for_match(self, match: Match) -> ScoreUpdate | None:
        if match.api_football_fixture_id:
            payload = self.client.get(
                "/fixtures",
                {"id": match.api_football_fixture_id},
            )
            rows = payload.get("response") or []
            if rows:
                return parse_fixture_score(rows[0], match)

        if not match.match_date or not match.team1 or not match.team2:
            return None

        fixtures = self.fetch_for_date(match.match_date.isoformat())
        team1_fifa = match.team1.fifa_code or name_to_fifa(match.team1.name) or ""
        team2_fifa = match.team2.fifa_code or name_to_fifa(match.team2.name) or ""
        fixture_id = link_fixture_id(
            fixtures,
            team1_fifa=team1_fifa,
            team2_fifa=team2_fifa,
            team1_name=match.team1.name,
            team2_name=match.team2.name,
            match_date=match.match_date.isoformat(),
        )
        if fixture_id is None:
            return None

        if match.api_football_fixture_id != fixture_id:
            match.api_football_fixture_id = fixture_id

        for row in fixtures:
            fixture = row.get("fixture") or {}
            if fixture.get("id") == fixture_id:
                return parse_fixture_score(row, match)
        return None

    def link_fixture_ids(self, matches: list[Match]) -> int:
        updated = 0
        dates = sorted({m.match_date.isoformat() for m in matches if m.match_date})
        fixtures_by_date: dict[str, list[dict]] = {}
        for date_iso in dates:
            fixtures_by_date[date_iso] = self.fetch_for_date(date_iso)

        for match in matches:
            if match.api_football_fixture_id or not match.match_date or not match.team1 or not match.team2:
                continue
            fixtures = fixtures_by_date.get(match.match_date.isoformat(), [])
            team1_fifa = match.team1.fifa_code or name_to_fifa(match.team1.name) or ""
            team2_fifa = match.team2.fifa_code or name_to_fifa(match.team2.name) or ""
            fixture_id = link_fixture_id(
                fixtures,
                team1_fifa=team1_fifa,
                team2_fifa=team2_fifa,
                team1_name=match.team1.name,
                team2_name=match.team2.name,
                match_date=match.match_date.isoformat(),
            )
            if fixture_id is not None:
                match.api_football_fixture_id = fixture_id
                updated += 1
        return updated

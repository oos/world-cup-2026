from __future__ import annotations

from flask import current_app

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.ingestion.api_football_client import (
    WORLD_CUP_LEAGUE_ID,
    ApiFootballClient,
    link_fixture_id,
)
from app.ingestion.live_status import attach_live_status, parse_api_football_live_status
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
    fixture_status = fixture.get("status") or {}
    status = ((fixture_status.get("short") or "")).lower() or None
    live_status = parse_api_football_live_status(fixture_status)

    score = attach_live_status(score, live_status)
    return ScoreUpdate(score=score, source="api_football", status=status)


def parse_fixture_goal_events(
    events: list[dict],
    row: dict,
    match: Match,
) -> tuple[list[dict], list[dict]]:
    teams = row.get("teams") or {}
    home = teams.get("home") or {}
    away = teams.get("away") or {}
    home_id = home.get("id")
    away_id = away.get("id")
    home_code = (home.get("code") or name_to_fifa(home.get("name") or "") or "").upper()
    away_code = (away.get("code") or name_to_fifa(away.get("name") or "") or "").upper()
    team1_code = (
        (match.team1.fifa_code if match.team1 else None)
        or name_to_fifa(match.team1.name if match.team1 else "")
        or ""
    ).upper()
    team2_code = (
        (match.team2.fifa_code if match.team2 else None)
        or name_to_fifa(match.team2.name if match.team2 else "")
        or ""
    ).upper()

    team1_is_home = team1_code == home_code and team2_code == away_code
    team1_is_away = team1_code == away_code and team2_code == home_code
    if not team1_is_home and not team1_is_away:
        return [], []

    goals1: list[dict] = []
    goals2: list[dict] = []

    for event in events:
        if (event.get("type") or "").lower() != "goal":
            continue

        team = event.get("team") or {}
        team_id = team.get("id")
        team_name = (team.get("name") or "").strip().lower()
        player = event.get("player") or {}
        assist = event.get("assist") or {}
        time_info = event.get("time") or {}
        detail = (event.get("detail") or "").lower()

        is_home = team_id == home_id or team_name == (home.get("name") or "").strip().lower()
        is_away = team_id == away_id or team_name == (away.get("name") or "").strip().lower()
        if is_home:
            bucket = goals1 if team1_is_home else goals2
        elif is_away:
            bucket = goals2 if team1_is_home else goals1
        else:
            continue

        payload: dict = {
            "name": (player.get("name") or "Unknown").strip(),
            "minute": time_info.get("elapsed"),
        }
        extra = time_info.get("extra")
        if extra:
            payload["offset"] = int(extra)
        if detail == "penalty":
            payload["penalty"] = True
        elif detail == "own goal":
            payload["owngoal"] = True
        assist_name = (assist.get("name") or "").strip()
        if assist_name:
            payload["assist"] = assist_name
        bucket.append(payload)

    def sort_goals(items: list[dict]) -> list[dict]:
        return sorted(
            items,
            key=lambda goal: (
                goal.get("minute") if goal.get("minute") is not None else 999,
                goal.get("offset") or 0,
            ),
        )

    return sort_goals(goals1), sort_goals(goals2)


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

    def enrich_update(self, update: ScoreUpdate, row: dict, match: Match) -> ScoreUpdate:
        fixture = row.get("fixture") or {}
        fixture_id = fixture.get("id") or match.api_football_fixture_id
        if not fixture_id:
            return update
        try:
            events = self.client.fetch_fixture_events(fixture_id=int(fixture_id))
            goals1, goals2 = parse_fixture_goal_events(events, row, match)
            if not goals1 and not goals2:
                return update
            return ScoreUpdate(
                score=update.score,
                source=update.source,
                status=update.status,
                goals1=goals1,
                goals2=goals2,
            )
        except Exception:
            return update

    def fetch_for_match(self, match: Match) -> ScoreUpdate | None:
        if match.api_football_fixture_id:
            payload = self.client.get(
                "/fixtures",
                {"id": match.api_football_fixture_id},
            )
            rows = payload.get("response") or []
            if rows:
                update = parse_fixture_score(rows[0], match)
                if update:
                    return self.enrich_update(update, rows[0], match)
                return None

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
                update = parse_fixture_score(row, match)
                if update:
                    return self.enrich_update(update, row, match)
                return None
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

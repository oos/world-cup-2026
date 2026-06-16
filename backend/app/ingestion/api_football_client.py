"""API-Football (api-sports) v3 client."""

from __future__ import annotations

import time
from typing import Any

import httpx

BASE_URL = "https://v3.football.api-sports.io"
WORLD_CUP_LEAGUE_ID = 1


class ApiFootballBudgetError(RuntimeError):
    """Raised when the daily request budget would be exceeded."""


class ApiFootballClient:
    def __init__(self, api_key: str, *, delay: float = 0.7) -> None:
        self.api_key = api_key
        self.delay = delay
        self._last_request = 0.0
        self._request_count = 0
        self._remaining_daily: int | None = None
        self._remaining_minute: int | None = None
        self.client = httpx.Client(
            timeout=60.0,
            headers={"x-apisports-key": api_key},
            base_url=BASE_URL,
        )

    def close(self) -> None:
        self.client.close()

    @property
    def request_count(self) -> int:
        return self._request_count

    @property
    def remaining_daily(self) -> int | None:
        return self._remaining_daily

    @property
    def remaining_minute(self) -> int | None:
        return self._remaining_minute

    def quota_summary(self) -> dict[str, int | None]:
        return {
            "requests_used": self.request_count,
            "remaining_daily": self._remaining_daily,
            "remaining_minute": self._remaining_minute,
        }

    def ensure_budget(self, needed: int, *, reserve: int = 5) -> None:
        if self._remaining_daily is None:
            return
        if self._remaining_daily < needed + reserve:
            raise ApiFootballBudgetError(
                f"Need {needed} request(s) with {reserve} reserve but only "
                f"{self._remaining_daily} daily requests remaining"
            )

    def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        self._rate_limit()
        response = self.client.get(path, params=params or {})
        self._request_count += 1
        self._update_quota_from_response(response)
        response.raise_for_status()
        payload = response.json()
        errors = payload.get("errors") or {}
        if errors:
            plan_error = errors.get("plan")
            if plan_error:
                raise RuntimeError(
                    f"API-Football plan restriction: {plan_error}. "
                    "World Cup 2026 requires a Pro plan or higher."
                )
            raise RuntimeError(f"API-Football error on {path}: {errors}")
        return payload

    def paginate(self, path: str, params: dict[str, Any] | None = None) -> list[Any]:
        page = 1
        items: list[Any] = []
        base_params = dict(params or {})
        while True:
            payload = self.get(path, {**base_params, "page": page})
            items.extend(payload.get("response") or [])
            paging = payload.get("paging") or {}
            current = int(paging.get("current") or page)
            total = int(paging.get("total") or current)
            if current >= total:
                break
            page += 1
        return items

    def fetch_league(self, *, league_id: int, season: int) -> dict[str, Any] | None:
        payload = self.get("/leagues", {"id": league_id, "season": season})
        rows = payload.get("response") or []
        return rows[0] if rows else None

    def fetch_teams(self, *, league_id: int, season: int) -> list[dict[str, Any]]:
        payload = self.get("/teams", {"league": league_id, "season": season})
        return payload.get("response") or []

    def fetch_fixtures(self, *, league_id: int, season: int) -> list[dict[str, Any]]:
        payload = self.get("/fixtures", {"league": league_id, "season": season})
        return payload.get("response") or []

    def fetch_fixtures_by_date(
        self,
        *,
        league_id: int,
        season: int,
        date: str,
    ) -> list[dict[str, Any]]:
        payload = self.get(
            "/fixtures",
            {"league": league_id, "season": season, "date": date},
        )
        return payload.get("response") or []

    def fetch_players(self, *, league_id: int, season: int) -> list[dict[str, Any]]:
        return self.paginate("/players", {"league": league_id, "season": season})

    def fetch_players_by_team(self, *, team_id: int, season: int) -> list[dict[str, Any]]:
        return self.paginate("/players", {"team": team_id, "season": season})

    def fetch_team_squad(self, *, team_id: int) -> list[dict[str, Any]]:
        payload = self.get("/players/squads", {"team": team_id})
        rows = payload.get("response") or []
        if not rows:
            return []
        return rows[0].get("players") or []

    def fetch_injuries(self, *, fixture_id: int) -> list[dict[str, Any]]:
        payload = self.get("/injuries", {"fixture": fixture_id})
        return payload.get("response") or []

    def fetch_predictions(self, *, fixture_id: int) -> list[dict[str, Any]]:
        payload = self.get("/predictions", {"fixture": fixture_id})
        return payload.get("response") or []

    def fetch_headtohead(
        self,
        *,
        team1_id: int,
        team2_id: int,
        last: int = 5,
    ) -> list[dict[str, Any]]:
        payload = self.get(
            "/fixtures/headtohead",
            {"h2h": f"{team1_id}-{team2_id}", "last": last},
        )
        return payload.get("response") or []

    def fetch_fixture_lineups(self, *, fixture_id: int) -> list[dict[str, Any]]:
        payload = self.get("/fixtures/lineups", {"fixture": fixture_id})
        return payload.get("response") or []

    def fetch_fixture_events(self, *, fixture_id: int) -> list[dict[str, Any]]:
        payload = self.get("/fixtures/events", {"fixture": fixture_id})
        return payload.get("response") or []

    def fetch_fixture_statistics(self, *, fixture_id: int) -> list[dict[str, Any]]:
        payload = self.get("/fixtures/statistics", {"fixture": fixture_id})
        return payload.get("response") or []

    def _update_quota_from_response(self, response: httpx.Response) -> None:
        daily = response.headers.get("x-ratelimit-requests-remaining")
        if daily is not None:
            try:
                self._remaining_daily = int(daily)
            except ValueError:
                pass
        minute = response.headers.get("X-Ratelimit-Remaining") or response.headers.get(
            "x-ratelimit-remaining"
        )
        if minute is not None:
            try:
                self._remaining_minute = int(minute)
            except ValueError:
                pass

    def _rate_limit(self) -> None:
        elapsed = time.time() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last_request = time.time()


def normalize_api_position(position: str | None) -> str | None:
    if not position:
        return None
    value = position.strip().lower()
    if "goal" in value or value == "gk":
        return "GK"
    if "def" in value:
        return "DEF"
    if "mid" in value:
        return "MID"
    if "att" in value or value == "for" in value or "strik" in value:
        return "FWD"
    return position.upper()[:3]


def club_from_statistics(
    statistics: list[dict[str, Any]],
    *,
    world_cup_league_id: int = WORLD_CUP_LEAGUE_ID,
) -> str | None:
    for stat in statistics:
        league = stat.get("league") or {}
        if league.get("id") == world_cup_league_id:
            continue
        team = stat.get("team") or {}
        name = (team.get("name") or "").strip()
        if name:
            return name
    return None


def world_cup_stat(
    statistics: list[dict[str, Any]],
    *,
    world_cup_league_id: int = WORLD_CUP_LEAGUE_ID,
) -> dict[str, Any] | None:
    for stat in statistics:
        league = stat.get("league") or {}
        if league.get("id") == world_cup_league_id:
            return stat
    return statistics[0] if statistics else None


def fixture_team_codes(fixture_row: dict[str, Any]) -> tuple[str, str]:
    teams = fixture_row.get("teams") or {}
    home = teams.get("home") or {}
    away = teams.get("away") or {}
    home_code = (home.get("code") or "").upper()
    away_code = (away.get("code") or "").upper()
    return home_code, away_code


def _normalize_team_name(name: str) -> str:
    return (name or "").strip().lower()


def link_fixture_id(
    fixtures: list[dict[str, Any]],
    *,
    team1_fifa: str,
    team2_fifa: str,
    team1_name: str | None = None,
    team2_name: str | None = None,
    match_date: str | None = None,
) -> int | None:
    wanted_codes = {team1_fifa.upper(), team2_fifa.upper()}
    wanted_names = {
        _normalize_team_name(team1_name or ""),
        _normalize_team_name(team2_name or ""),
    }
    wanted_names.discard("")

    for row in fixtures:
        fixture = row.get("fixture") or {}
        if match_date:
            fixture_date = (fixture.get("date") or "")[:10]
            if fixture_date and fixture_date != match_date:
                continue

        teams = row.get("teams") or {}
        home = teams.get("home") or {}
        away = teams.get("away") or {}
        home_code = (home.get("code") or "").upper()
        away_code = (away.get("code") or "").upper()
        if home_code and away_code and {home_code, away_code} == wanted_codes:
            fixture_id = fixture.get("id")
            if fixture_id is not None:
                return int(fixture_id)

        home_name = _normalize_team_name(home.get("name") or "")
        away_name = _normalize_team_name(away.get("name") or "")
        if wanted_names and {home_name, away_name} == wanted_names:
            fixture_id = fixture.get("id")
            if fixture_id is not None:
                return int(fixture_id)

    return None

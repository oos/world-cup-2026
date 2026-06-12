"""API-Football (api-sports) v3 client."""

from __future__ import annotations

import time
from typing import Any

import httpx

BASE_URL = "https://v3.football.api-sports.io"
WORLD_CUP_LEAGUE_ID = 1


class ApiFootballClient:
    def __init__(self, api_key: str, *, delay: float = 0.7) -> None:
        self.api_key = api_key
        self.delay = delay
        self._last_request = 0.0
        self._request_count = 0
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

    def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        self._rate_limit()
        response = self.client.get(path, params=params or {})
        self._request_count += 1
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

    def fetch_players(self, *, league_id: int, season: int) -> list[dict[str, Any]]:
        return self.paginate("/players", {"league": league_id, "season": season})

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
    if "att" in value or "for" in value or "strik" in value:
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

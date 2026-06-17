"""Client for openfootball football.json domestic-league datasets.

Fetches free, public-domain fixtures/results, e.g.
https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/en.1.json
"""

from __future__ import annotations

from datetime import datetime

import httpx

from app.ingestion.dto import MatchDTO

BASE_URL = "https://raw.githubusercontent.com/openfootball/football.json/master"


class OpenFootballLeagueClient:
    def __init__(self, *, code: str, season: str) -> None:
        self.code = code
        self.season = season
        self.client = httpx.Client(timeout=30.0)

    @property
    def url(self) -> str:
        return f"{BASE_URL}/{self.season}/{self.code}.json"

    def fetch_matches(self) -> list[MatchDTO]:
        data = self._get(self.url)
        matches: list[MatchDTO] = []
        for item in data.get("matches", []):
            match_date = None
            raw_date = item.get("date")
            if raw_date:
                try:
                    match_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
                except ValueError:
                    match_date = None
            matches.append(
                MatchDTO(
                    round=item.get("round", ""),
                    match_date=match_date,
                    match_time=item.get("time"),
                    team1_name=item.get("team1", ""),
                    team2_name=item.get("team2", ""),
                    group_name=None,
                    stadium_name=item.get("stadium") or item.get("ground"),
                    match_number=item.get("num"),
                    score=item.get("score"),
                )
            )
        return matches

    def fetch_team_names(self) -> list[str]:
        names: list[str] = []
        seen: set[str] = set()
        for match in self.fetch_matches():
            for name in (match.team1_name, match.team2_name):
                if name and name not in seen:
                    seen.add(name)
                    names.append(name)
        return sorted(names)

    def _get(self, url: str) -> dict:
        response = self.client.get(url)
        response.raise_for_status()
        return response.json()

    def close(self) -> None:
        self.client.close()

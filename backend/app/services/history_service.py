import json
from datetime import datetime
from pathlib import Path

import httpx

from app.ingestion.world_cup_years import HISTORICAL_WORLD_CUP_YEARS

OPENFOOTBALL_BASE = "https://raw.githubusercontent.com/openfootball/worldcup.json/master"
DEFAULT_CACHE_PATH = Path(__file__).resolve().parents[2] / "data" / "history_cache.json"


class HistoryService:
    def __init__(self, cache_path: Path | None = None) -> None:
        self.cache_path = cache_path or DEFAULT_CACHE_PATH
        self._cache: dict | None = None

    def sync_history(self) -> dict:
        tournaments = []
        matches = []
        for year in HISTORICAL_WORLD_CUP_YEARS:
            year_matches = self._fetch_year(year)
            tournaments.append(
                {
                    "year": year,
                    "name": f"FIFA World Cup {year}",
                    "match_count": len(year_matches),
                }
            )
            matches.extend(year_matches)

        payload = {
            "synced_at": datetime.utcnow().isoformat(),
            "tournaments": tournaments,
            "matches": matches,
        }
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache_path.write_text(json.dumps(payload, separators=(",", ":")))
        self._cache = payload
        return {
            "tournaments": len(tournaments),
            "matches": len(matches),
            "cache_path": str(self.cache_path),
        }

    def list_tournaments(self) -> list[dict]:
        return self._load()["tournaments"]

    def list_matches(
        self,
        year: int | None = None,
        round_name: str | None = None,
        group: str | None = None,
    ) -> list[dict]:
        matches = self._load()["matches"]
        if year is not None:
            matches = [m for m in matches if m["year"] == year]
        if round_name:
            matches = [m for m in matches if m["round"] == round_name]
        if group:
            matches = [m for m in matches if m["group"] == group]
        return matches

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

    def _load(self) -> dict:
        if self._cache is not None:
            return self._cache
        if self.cache_path.exists():
            self._cache = json.loads(self.cache_path.read_text())
            return self._cache
        return self.sync_history()

    def _fetch_year(self, year: int) -> list[dict]:
        url = f"{OPENFOOTBALL_BASE}/{year}/worldcup.json"
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url)
            response.raise_for_status()
            data = response.json()

        matches = []
        for item in data.get("matches", []):
            matches.append(
                {
                    "year": year,
                    "round": item.get("round", ""),
                    "match_number": item.get("num"),
                    "date": item.get("date"),
                    "time": item.get("time"),
                    "group": item.get("group"),
                    "team1": item.get("team1", ""),
                    "team2": item.get("team2", ""),
                    "stadium": item.get("ground"),
                    "score": item.get("score"),
                }
            )
        return matches

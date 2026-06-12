import json
import re
from datetime import datetime
from pathlib import Path

import httpx

from app.ingestion.known_scores import apply_known_score
from app.ingestion.world_cup_years import (
    CURRENT_WORLD_CUP_YEAR,
    HISTORICAL_WORLD_CUP_YEARS,
    WORLD_CUP_FORMATS,
)

OPENFOOTBALL_BASE = "https://raw.githubusercontent.com/openfootball/worldcup.json/master"
DEFAULT_CACHE_PATH = Path(__file__).resolve().parents[2] / "data" / "history_cache.json"


class HistoryService:
    def __init__(self, cache_path: Path | None = None) -> None:
        self.cache_path = cache_path or DEFAULT_CACHE_PATH
        self._cache: dict | None = None

    def sync_history(self) -> dict:
        tournaments = []
        matches = []
        for year in [*HISTORICAL_WORLD_CUP_YEARS, CURRENT_WORLD_CUP_YEAR]:
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
        return [apply_known_score(match) for match in matches]

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
        date = match.get("date") or "unknown"
        return f"{date}-{self._team_slug(teams[0])}-vs-{self._team_slug(teams[1])}"

    def get_match_detail(self, year: int, match_key: str) -> dict | None:
        for match in self.list_matches(year=year):
            if self.build_match_key(match) == match_key:
                return self._format_match_detail(match)
        return None

    def _team_slug(self, name: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
        return slug or "team"

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
            "match_key": self.build_match_key(match),
            "team1_score": team1_score,
            "team2_score": team2_score,
            "went_to_extra_time": went_to_extra_time,
            "penalty_score": penalty_score,
            "half_time_score": self._score_pair(score.get("ht")),
            "full_time_score": self._score_pair(ft),
            "extra_time_score": self._score_pair(et),
            "team1_goals": self._format_goal_events(team1_goals_raw),
            "team2_goals": self._format_goal_events(team2_goals_raw),
            "timeline": self._build_match_timeline(
                match,
                team1_goals_raw,
                team2_goals_raw,
            ),
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

    def _load(self) -> dict:
        if self._cache is not None:
            return self._cache
        if self.cache_path.exists():
            self._cache = json.loads(self.cache_path.read_text())
            return self._cache
        self.sync_history()
        return self._cache or {"tournaments": [], "matches": []}

    def _fetch_year(self, year: int) -> list[dict]:
        url = f"{OPENFOOTBALL_BASE}/{year}/worldcup.json"
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url)
            response.raise_for_status()
            data = response.json()

        matches = []
        for item in data.get("matches", []):
            matches.append(
                apply_known_score(
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
                        "goals1": item.get("goals1") or [],
                        "goals2": item.get("goals2") or [],
                    }
                )
            )
        return matches

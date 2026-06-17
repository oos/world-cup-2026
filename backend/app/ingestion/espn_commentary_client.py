import time
from datetime import date, datetime

import httpx

from app.ingestion.live_status import parse_espn_live_status

ESPN_SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.world/summary"
ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.world/scoreboard"

# Approximate tournament windows for ESPN scoreboard discovery (YYYYMMDD-YYYYMMDD).
TOURNAMENT_DATE_WINDOWS: dict[int, str] = {
    1998: "19980610-19980712",
    2002: "20020531-20020630",
    2006: "20060609-20060709",
    2010: "20100611-20100711",
    2014: "20140612-20140713",
    2018: "20180614-20180715",
    2022: "20221120-20221220",
    2026: "20260611-20260719",
}


class EspnCommentaryClient:
    def __init__(self, user_agent: str, delay: float = 6.0) -> None:
        self.delay = delay
        self._last_request = 0.0
        self.client = httpx.Client(
            timeout=30.0,
            headers={"User-Agent": user_agent},
            follow_redirects=True,
        )

    def close(self) -> None:
        self.client.close()

    def _rate_limit(self) -> None:
        elapsed = time.time() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last_request = time.time()

    def _get_json(self, url: str, params: dict | None = None) -> dict:
        self._rate_limit()
        for attempt in range(3):
            try:
                response = self.client.get(url, params=params)
                if response.status_code == 429:
                    time.sleep(self.delay * (2 ** attempt))
                    continue
                response.raise_for_status()
                payload = response.json()
                if isinstance(payload, dict) and payload.get("code") == 404:
                    return {}
                return payload
            except httpx.HTTPError:
                if attempt == 2:
                    raise
                time.sleep(self.delay * (2 ** attempt))
        return {}

    def fetch_scoreboard(self, dates: str, limit: int = 200) -> list[dict]:
        payload = self._get_json(
            ESPN_SCOREBOARD_URL,
            params={"dates": dates, "limit": limit},
        )
        return payload.get("events") or []

    def fetch_summary(self, game_id: str) -> dict:
        return self._get_json(ESPN_SUMMARY_URL, params={"event": game_id})

    def parse_scoreboard_event(self, event: dict) -> dict | None:
        game_id = str(event.get("id") or "")
        if not game_id:
            return None

        competition = (event.get("competitions") or [{}])[0]
        competitors = competition.get("competitors") or []
        home_team = away_team = None
        home_score = away_score = None
        for competitor in competitors:
            name = (competitor.get("team") or {}).get("displayName")
            score_text = competitor.get("score")
            score_value = None
            if score_text not in (None, ""):
                try:
                    score_value = int(score_text)
                except (TypeError, ValueError):
                    score_value = None
            if competitor.get("homeAway") == "home":
                home_team = name
                home_score = score_value
            elif competitor.get("homeAway") == "away":
                away_team = name
                away_score = score_value

        status = competition.get("status") or {}
        status_type = status.get("type") or {}

        match_date = None
        date_text = event.get("date") or competition.get("date")
        if date_text:
            match_date = datetime.fromisoformat(date_text.replace("Z", "+00:00")).date()

        year = None
        season = (event.get("season") or {}).get("year")
        if season:
            year = int(season)
        elif match_date:
            year = match_date.year

        return {
            "espn_game_id": game_id,
            "year": year,
            "match_date": match_date,
            "home_team": home_team,
            "away_team": away_team,
            "home_score": home_score,
            "away_score": away_score,
            "status_state": status_type.get("state"),
            "status_name": status_type.get("name"),
            "status_completed": status_type.get("completed"),
            "live_status": parse_espn_live_status(competition),
            "name": event.get("name") or event.get("shortName"),
        }

    def parse_commentary(self, summary: dict) -> list[dict]:
        key_events = summary.get("keyEvents") or []
        key_texts = {item.get("text") for item in key_events if item.get("text")}
        key_types = {
            item.get("text"): (item.get("type") or {}).get("text")
            for item in key_events
            if item.get("text")
        }
        key_periods = {
            item.get("text"): (item.get("period") or {}).get("number")
            for item in key_events
            if item.get("text")
        }

        events: list[dict] = []
        for item in summary.get("commentary") or []:
            text = (item.get("text") or "").strip()
            if not text:
                continue
            clock = item.get("time") or {}
            events.append(
                {
                    "sequence": int(item.get("sequence") or 0),
                    "period": key_periods.get(text),
                    "clock_display": clock.get("displayValue") or None,
                    "clock_value": clock.get("value"),
                    "event_type": key_types.get(text),
                    "text": text,
                    "is_key_event": text in key_texts,
                    "raw": item,
                }
            )

        events.sort(key=lambda row: row["sequence"])
        return events

    @staticmethod
    def tournament_dates(year: int) -> str | None:
        return TOURNAMENT_DATE_WINDOWS.get(year)

    @staticmethod
    def parse_lineups(summary: dict) -> list[dict]:
        """Parse team rosters from an ESPN match summary."""
        parsed: list[dict] = []
        for team_block in summary.get("rosters") or []:
            home_away = team_block.get("homeAway")
            if home_away not in {"home", "away"}:
                continue

            team_info = team_block.get("team") or {}
            players: list[dict] = []
            for entry in team_block.get("roster") or []:
                athlete = entry.get("athlete") or {}
                position = entry.get("position") or {}
                jersey = entry.get("jersey")
                try:
                    jersey_number = int(jersey) if jersey is not None else None
                except (TypeError, ValueError):
                    jersey_number = None

                players.append(
                    {
                        "espn_athlete_id": str(athlete.get("id") or "") or None,
                        "display_name": (athlete.get("displayName") or athlete.get("fullName") or "").strip(),
                        "jersey_number": jersey_number,
                        "position": position.get("abbreviation") or position.get("name"),
                        "starter": bool(entry.get("starter")),
                    }
                )

            if not players:
                continue

            parsed.append(
                {
                    "home_away": home_away,
                    "team_name": team_info.get("displayName") or team_info.get("name"),
                    "formation": team_block.get("formation"),
                    "players": players,
                }
            )

        return parsed

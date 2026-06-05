from datetime import datetime

import httpx

from app.ingestion.dto import MatchDTO, StadiumDTO, TeamDTO

BASE_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026"


class OpenFootballClient:
    def __init__(self) -> None:
        self.client = httpx.Client(timeout=30.0)

    def fetch_teams(self) -> list[TeamDTO]:
        data = self._get(f"{BASE_URL}/worldcup.teams.json")
        teams = []
        for item in data:
            teams.append(
                TeamDTO(
                    name=item["name"],
                    fifa_code=item["fifa_code"],
                    group_name=item.get("group"),
                    confederation=item.get("confed"),
                    flag_icon=item.get("flag_icon"),
                    continent=item.get("continent"),
                    name_normalised=item.get("name_normalised"),
                )
            )
        return teams

    def fetch_matches(self) -> list[MatchDTO]:
        data = self._get(f"{BASE_URL}/worldcup.json")
        matches = []
        for item in data.get("matches", []):
            match_date = None
            if item.get("date"):
                match_date = datetime.strptime(item["date"], "%Y-%m-%d").date()
            matches.append(
                MatchDTO(
                    round=item.get("round", ""),
                    match_date=match_date,
                    match_time=item.get("time"),
                    team1_name=item.get("team1", ""),
                    team2_name=item.get("team2", ""),
                    group_name=item.get("group"),
                    stadium_name=item.get("ground"),
                    match_number=item.get("num"),
                    score=item.get("score"),
                )
            )
        return matches

    def fetch_stadiums(self) -> list[StadiumDTO]:
        data = self._get(f"{BASE_URL}/worldcup.stadiums.json")
        items = data.get("stadiums", data) if isinstance(data, dict) else data
        stadiums = []
        for item in items:
            stadiums.append(
                StadiumDTO(
                    name=item.get("name", item.get("stadium", "")),
                    city=item.get("city"),
                    country=item.get("cc", item.get("country")),
                )
            )
        return stadiums

    def _get(self, url: str) -> dict | list:
        response = self.client.get(url)
        response.raise_for_status()
        return response.json()

    def close(self) -> None:
        self.client.close()

"""Map API-Football fixture payloads to internal match fields."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class ParsedApiFixture:
    fixture_id: int
    match_date: date | None
    match_time: str | None
    round_name: str | None
    stage: str | None
    group_name: str | None
    leg: int | None
    home_api_team_id: int | None
    away_api_team_id: int | None
    home_name: str
    away_name: str
    score: dict | None
    status_short: str | None


def parse_api_score(row: dict) -> dict | None:
    score = row.get("score") or {}
    goals = row.get("goals") or {}
    ft = score.get("fulltime") or {}
    home = ft.get("home")
    away = ft.get("away")
    if home is None or away is None:
        home = goals.get("home")
        away = goals.get("away")
    if home is None or away is None:
        return None
    try:
        result: dict = {"ft": [int(home), int(away)]}
    except (TypeError, ValueError):
        return None
    pen = score.get("penalty") or {}
    if pen.get("home") is not None and pen.get("away") is not None:
        try:
            result["pen"] = [int(pen["home"]), int(pen["away"])]
        except (TypeError, ValueError):
            pass
    return result


def stage_and_group_from_round(round_name: str | None) -> tuple[str | None, str | None]:
    if not round_name:
        return None, None
    text = round_name.strip()
    lower = text.lower()

    group_match = re.match(r"^group\s+([a-z0-9]+)\s*-\s*\d+", lower, re.IGNORECASE)
    if group_match:
        return "group", group_match.group(1).upper()

    if lower.startswith("league stage") or lower.startswith("league phase"):
        return "league_phase", None

    if (
        lower.startswith("regular season")
        or lower.startswith("matchday")
        or re.match(r"^\d+\s*st\s*phase", lower)
    ):
        return "league", None

    knockout = _knockout_stage_from_round(lower)
    if knockout:
        return knockout, None

    if "qualifying" in lower or "preliminary" in lower:
        return "qualifying", None

    return "knockout", None


def _knockout_stage_from_round(text: str) -> str | None:
    if text.startswith("matchday"):
        return None
    if "play-off" in text and "third" not in text:
        return "knockout_playoff"
    if "round of 32" in text or "last 32" in text:
        return "round_of_32"
    if "round of 16" in text or "last 16" in text:
        return "round_of_16"
    if "quarter" in text:
        return "quarter_final"
    if "semi" in text:
        return "semi_final"
    if "third" in text:
        return "third_place"
    if "final" in text:
        return "final"
    return None


def infer_leg(round_name: str | None) -> int | None:
    if not round_name:
        return None
    match = re.search(r"\bleg\s+(\d+)\b", round_name, re.IGNORECASE)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None


def parse_api_fixture(row: dict) -> ParsedApiFixture | None:
    fixture = row.get("fixture") or {}
    fixture_id = fixture.get("id")
    if fixture_id is None:
        return None

    league = row.get("league") or {}
    round_name = league.get("round") or fixture.get("round")
    stage, group_name = stage_and_group_from_round(round_name)

    date_text = fixture.get("date")
    match_date = None
    match_time = None
    if date_text:
        try:
            dt = datetime.fromisoformat(str(date_text).replace("Z", "+00:00"))
            match_date = dt.date()
            match_time = dt.strftime("%H:%M")
        except ValueError:
            pass

    teams = row.get("teams") or {}
    home = teams.get("home") or {}
    away = teams.get("away") or {}
    home_name = (home.get("name") or "").strip()
    away_name = (away.get("name") or "").strip()
    if not home_name or not away_name:
        return None

    status = (fixture.get("status") or {}).get("short")

    return ParsedApiFixture(
        fixture_id=int(fixture_id),
        match_date=match_date,
        match_time=match_time,
        round_name=round_name,
        stage=stage,
        group_name=group_name,
        leg=infer_leg(round_name),
        home_api_team_id=int(home["id"]) if home.get("id") is not None else None,
        away_api_team_id=int(away["id"]) if away.get("id") is not None else None,
        home_name=home_name,
        away_name=away_name,
        score=parse_api_score(row),
        status_short=status,
    )

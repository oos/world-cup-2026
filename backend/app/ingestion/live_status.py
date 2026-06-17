"""Parse and merge in-play match clock metadata from score providers."""

from __future__ import annotations

import re
from typing import Any

FINAL_PERIOD_CODES = frozenset({"FT", "AET", "PEN", "POST"})
IN_PLAY_PERIOD_CODES = frozenset({"1H", "HT", "2H", "ET", "ET1", "ET2", "P", "BT", "LIVE"})

_ESPN_PERIOD_BY_NAME: dict[str, str] = {
    "STATUS_FIRST_HALF": "1H",
    "STATUS_HALFTIME": "HT",
    "STATUS_SECOND_HALF": "2H",
    "STATUS_FIRST_HALF_EXTRA_TIME": "ET1",
    "STATUS_EXTRA_TIME_FIRST_HALF": "ET1",
    "STATUS_SECOND_HALF_EXTRA_TIME": "ET2",
    "STATUS_EXTRA_TIME_SECOND_HALF": "ET2",
    "STATUS_EXTRA_TIME_HALFTIME": "BT",
    "STATUS_SHOOTOUT": "P",
    "STATUS_PENALTY_SHOOTOUT": "P",
    "STATUS_FULL_TIME": "FT",
    "STATUS_FULL_TIME_EXTRA_TIME": "AET",
    "STATUS_FINAL_PEN": "PEN",
    "STATUS_FINAL": "FT",
}

_API_FOOTBALL_PERIOD: dict[str, str] = {
    "1h": "1H",
    "ht": "HT",
    "2h": "2H",
    "et": "ET",
    "bt": "BT",
    "p": "P",
    "ft": "FT",
    "aet": "AET",
    "pen": "PEN",
    "live": "LIVE",
}


def _clean_display(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _parse_clock_display(display: str | None) -> tuple[int | None, int | None]:
    if not display:
        return None, None
    text = display.strip().lower().replace("’", "'")
    match = re.match(r"^(\d+)\s*'\s*\+\s*(\d+)\s*'?$", text)
    if match:
        return int(match.group(1)), int(match.group(2))
    match = re.match(r"^(\d+)\s*'?$", text)
    if match:
        return int(match.group(1)), None
    return None, None


def espn_period_code(status_name: str | None, period: Any = None) -> str | None:
    if status_name:
        mapped = _ESPN_PERIOD_BY_NAME.get(status_name.upper())
        if mapped:
            return mapped
    if period == 1:
        return "1H"
    if period == 2:
        return "2H"
    if period in {3, 4}:
        return "ET"
    if period == 5:
        return "P"
    return None


def parse_espn_live_status(competition: dict) -> dict | None:
    status = competition.get("status") or {}
    status_type = status.get("type") or {}
    state = _clean_display(status_type.get("state"))
    if not state:
        return None

    period = espn_period_code(status_type.get("name"), status.get("period"))
    display = _clean_display(
        status.get("displayClock")
        or status_type.get("shortDetail")
        or status_type.get("detail")
    )
    minute, added = _parse_clock_display(display)

    if state == "pre":
        return None

    if state == "post" or period in FINAL_PERIOD_CODES:
        return {
            "period": period or "FT",
            "minute": minute,
            "added": added,
            "display": display or (period or "FT"),
            "state": "post",
        }

    if state != "in" and period not in IN_PLAY_PERIOD_CODES:
        return None

    return {
        "period": period or "LIVE",
        "minute": minute,
        "added": added,
        "display": display,
        "state": "in",
    }


def parse_api_football_live_status(fixture_status: dict) -> dict | None:
    short = _clean_display((fixture_status or {}).get("short"))
    if not short:
        return None

    period = _API_FOOTBALL_PERIOD.get(short.lower(), short.upper())
    elapsed = fixture_status.get("elapsed")
    extra = fixture_status.get("extra")
    minute = int(elapsed) if elapsed is not None else None
    added = int(extra) if extra is not None else None

    if period in FINAL_PERIOD_CODES:
        return {
            "period": period,
            "minute": minute,
            "added": added,
            "display": format_live_display(period, minute, added),
            "state": "post",
        }

    if period in {"HT", "BT"}:
        return {
            "period": period,
            "minute": minute,
            "added": added,
            "display": format_live_display(period, minute, added),
            "state": "in",
        }

    if period in IN_PLAY_PERIOD_CODES or minute is not None:
        return {
            "period": period,
            "minute": minute,
            "added": added,
            "display": format_live_display(period, minute, added),
            "state": "in",
        }

    return None


def format_live_display(
    period: str | None,
    minute: int | None,
    added: int | None,
) -> str | None:
    code = (period or "").upper()
    if code == "HT":
        return "Half-time"
    if code == "BT":
        return "Break"
    if code in {"P", "PEN"}:
        return "Penalties"
    if code == "ET":
        if minute is not None:
            if added:
                return f"ET {minute}'+{added}"
            return f"ET {minute}'"
        return "Extra time"
    if code in {"ET1", "ET2"}:
        prefix = "ET"
        if minute is not None:
            if added:
                return f"{prefix} {minute}'+{added}"
            return f"{prefix} {minute}'"
        return "Extra time"
    if minute is not None:
        if added:
            return f"{minute}'+{added}"
        return f"{minute}'"
    return None


def is_final_live_status(live: dict | None) -> bool:
    if not live:
        return False
    if live.get("state") == "post":
        return True
    period = (live.get("period") or "").upper()
    return period in FINAL_PERIOD_CODES


def merge_live_into_score(existing: dict | None, incoming_live: dict | None) -> dict | None:
    score = dict(existing or {})
    if not incoming_live:
        return score or None

    if is_final_live_status(incoming_live):
        score.pop("live", None)
        score["final"] = True
        return score

    score["live"] = incoming_live
    score.pop("final", None)
    return score


def attach_live_status(score: dict | None, live: dict | None) -> dict | None:
    if score is None and live is None:
        return None
    merged = dict(score or {})
    if live is None:
        return merged or None
    if is_final_live_status(live):
        merged.pop("live", None)
        merged["final"] = True
    else:
        merged["live"] = live
        merged.pop("final", None)
    return merged

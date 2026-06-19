"""Compute player minutes from ESPN match summaries."""

from __future__ import annotations

from app.ingestion.espn_commentary_client import EspnCommentaryClient
from app.ingestion.espn_goals import _team_side
from app.ingestion.live_status import _parse_clock_display
from app.models.match import Match


def _event_minute(event: dict) -> tuple[int | None, int]:
    clock = event.get("clock") or {}
    minute, added = _parse_clock_display(clock.get("displayValue"))
    if minute is None and clock.get("value") is not None:
        try:
            minute = int((float(clock["value"]) + 59) // 60)
        except (TypeError, ValueError):
            minute = None
    return minute, added or 0


def _match_end_minute(summary: dict) -> int:
    max_minute = 0
    for event in summary.get("keyEvents") or []:
        minute, added = _event_minute(event)
        if minute is not None:
            max_minute = max(max_minute, minute + added)

    for item in summary.get("commentary") or []:
        clock = item.get("time") or {}
        minute, added = _parse_clock_display(clock.get("displayValue"))
        if minute is not None:
            max_minute = max(max_minute, minute + (added or 0))

    return max(max_minute, 90)


def _parse_substitutions(summary: dict) -> list[dict]:
    substitutions: list[dict] = []
    for event in summary.get("keyEvents") or []:
        type_text = ((event.get("type") or {}).get("text") or "").lower()
        if "substitution" not in type_text:
            continue

        participants = event.get("participants") or []
        if len(participants) < 2:
            continue

        on_name = (
            (participants[0].get("athlete") or {}).get("displayName")
            or (participants[0].get("athlete") or {}).get("fullName")
            or ""
        ).strip()
        off_name = (
            (participants[1].get("athlete") or {}).get("displayName")
            or (participants[1].get("athlete") or {}).get("fullName")
            or ""
        ).strip()
        if not on_name or not off_name:
            continue

        minute, added = _event_minute(event)
        if minute is None:
            continue

        substitutions.append(
            {
                "on": on_name,
                "off": off_name,
                "team": (event.get("team") or {}).get("displayName"),
                "minute": minute + added,
            }
        )
    return substitutions


def _player_minutes(
    players: list[dict],
    substitutions: list[dict],
    *,
    end_minute: int,
) -> list[dict]:
    sub_on: dict[str, int] = {}
    sub_off: dict[str, int] = {}
    for sub in substitutions:
        sub_on[sub["on"]] = sub["minute"]
        sub_off[sub["off"]] = sub["minute"]

    rows: list[dict] = []
    for player in players:
        name = (player.get("display_name") or "").strip()
        if not name:
            continue

        if player.get("starter"):
            start = 0
            end = sub_off.get(name, end_minute)
        else:
            start = sub_on.get(name)
            if start is None:
                continue
            end = sub_off.get(name, end_minute)

        minutes = max(end - start, 0)
        if minutes <= 0:
            continue

        rows.append({"name": name, "minutes": minutes})

    return sorted(rows, key=lambda row: (-row["minutes"], row["name"].casefold()))


def parse_espn_player_minutes(summary: dict, match: Match) -> tuple[list[dict], list[dict]]:
    if not summary:
        return [], []

    end_minute = _match_end_minute(summary)
    substitutions = _parse_substitutions(summary)
    minutes1: list[dict] = []
    minutes2: list[dict] = []

    for block in EspnCommentaryClient.parse_lineups(summary):
        team_name = block.get("team_name")
        side = _team_side(team_name, match)
        if side is None:
            continue

        team_subs = [
            sub
            for sub in substitutions
            if _team_side(sub.get("team"), match) == side
        ]
        rows = _player_minutes(block.get("players") or [], team_subs, end_minute=end_minute)
        if side == "team1":
            minutes1 = rows
        else:
            minutes2 = rows

    return minutes1, minutes2

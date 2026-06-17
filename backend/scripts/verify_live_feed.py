"""Verify live score, clock, and scorers against ESPN for an in-play match."""

from __future__ import annotations

import re
import sys

import httpx

from app import create_app
from app.extensions import db
from app.ingestion.espn_commentary_client import EspnCommentaryClient
from app.ingestion.espn_goals import parse_espn_summary_goals
from app.ingestion.score_providers.espn import EspnScoreProvider
from app.models.match import Match
from app.services.score_sync_service import ScoreSyncService


def _parse_minute(display: str | None) -> int | None:
    if not display:
        return None
    match = re.match(r"^(\d+)", display.replace("'", ""))
    return int(match.group(1)) if match else None


def _find_live_candidate() -> Match | None:
    for match in db.session.scalars(db.select(Match)).all():
        score = match.score if isinstance(match.score, dict) else {}
        live = score.get("live") or {}
        if live.get("state") == "in":
            return match
    return None


def _espn_reference(client: EspnCommentaryClient, match: Match) -> dict | None:
    if not match.match_date:
        return None
    date_key = match.match_date.strftime("%Y%m%d")
    for event in client.fetch_scoreboard(date_key):
        parsed = client.parse_scoreboard_event(event)
        if not parsed or not EspnScoreProvider.match_db_row(parsed, match):
            continue
        summary = client.fetch_summary(str(parsed["espn_game_id"]))
        goals1, goals2 = parse_espn_summary_goals(summary, match)
        return {
            "parsed": parsed,
            "score": EspnScoreProvider.map_score_for_match(match, parsed),
            "goals1": goals1,
            "goals2": goals2,
        }
    return None


def verify_live_feed() -> int:
    app = create_app()
    with app.app_context():
        match = _find_live_candidate()
        if not match:
            print("FAIL: no in-play match found in database")
            return 1

        client = EspnCommentaryClient(ScoreSyncService.USER_AGENT, delay=0)
        try:
            reference = _espn_reference(client, match)
            if not reference:
                print(f"FAIL: could not find ESPN reference for match {match.id}")
                return 1

            sync = ScoreSyncService(delay=0)
            try:
                result = sync.sync()
            finally:
                sync.close()

            db.session.refresh(match)
            score = match.score if isinstance(match.score, dict) else {}
            live = score.get("live") or {}
            ref_live = (reference["score"] or {}).get("live") or {}
            ref_ft = (reference["score"] or {}).get("ft")
            our_ft = score.get("ft")

            errors: list[str] = []

            if result.get("updated", 0) == 0 and ref_live.get("minute") != live.get("minute"):
                errors.append(
                    f"sync updated 0 but clock differs (db={live.get('display')}, espn={ref_live.get('display')})"
                )

            if our_ft != ref_ft:
                errors.append(f"score mismatch db={our_ft} espn={ref_ft}")

            ref_minute = ref_live.get("minute")
            our_minute = live.get("minute")
            if ref_minute is not None and our_minute is not None:
                if abs(ref_minute - our_minute) > 2:
                    errors.append(
                        f"clock drift too large db={live.get('display')} espn={ref_live.get('display')}"
                    )
            elif live.get("state") != "in":
                errors.append("match should be in-play but live.state is not 'in'")

            ref_goal_count = len(reference["goals1"]) + len(reference["goals2"])
            our_goal_count = len(match.goals1 or []) + len(match.goals2 or [])
            if ref_goal_count > 0 and our_goal_count == 0:
                errors.append(
                    f"scorers missing (espn has {ref_goal_count}, db has {our_goal_count})"
                )
            elif ref_goal_count > 0:
                for side, ours, ref in (
                    ("team1", match.goals1 or [], reference["goals1"]),
                    ("team2", match.goals2 or [], reference["goals2"]),
                ):
                    our_names = {g.get("name") for g in ours}
                    ref_names = {g.get("name") for g in ref}
                    if our_names != ref_names:
                        errors.append(f"{side} scorer names mismatch db={our_names} espn={ref_names}")
                    for our_goal, ref_goal in zip(
                        sorted(ours, key=lambda g: (g.get("minute") or 999, g.get("offset") or 0)),
                        sorted(ref, key=lambda g: (g.get("minute") or 999, g.get("offset") or 0)),
                    ):
                        if our_goal.get("minute") != ref_goal.get("minute") or our_goal.get("offset") != ref_goal.get("offset"):
                            errors.append(
                                f"{side} minute mismatch for {our_goal.get('name')}: "
                                f"db={our_goal.get('minute')}+{our_goal.get('offset')} "
                                f"espn={ref_goal.get('minute')}+{ref_goal.get('offset')}"
                            )

            team1 = match.team1.name if match.team1 else "?"
            team2 = match.team2.name if match.team2 else "?"
            print(f"Match {match.id}: {team1} vs {team2}")
            print(f"Sync result: {result}")
            print(f"Score: {our_ft} | Live: {live.get('display')} ({live.get('period')})")
            print(f"Scorers: {match.goals1} | {match.goals2}")
            print(f"ESPN ref: score={ref_ft} live={ref_live.get('display')} goals={reference['goals1']}+{reference['goals2']}")

            if errors:
                print("FAIL:")
                for error in errors:
                    print(f"  - {error}")
                return 1

            print("PASS: live feed matches ESPN reference")
            return 0
        finally:
            client.close()


if __name__ == "__main__":
    sys.exit(verify_live_feed())

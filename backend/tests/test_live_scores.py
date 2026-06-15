from datetime import date, datetime, timezone

from app.ingestion.espn_commentary_client import EspnCommentaryClient
from app.ingestion.known_scores import find_known_score, known_score_for_teams
from app.services.live_score_service import LiveScoreService


CANADA_BOSNIA_EVENT = {
    "id": "999001",
    "date": "2026-06-12T19:00:00Z",
    "season": {"year": 2026},
    "competitions": [
        {
            "date": "2026-06-12T19:00:00Z",
            "status": {
                "type": {
                    "name": "STATUS_FULL_TIME",
                    "state": "post",
                    "completed": True,
                }
            },
            "competitors": [
                {"homeAway": "home", "team": {"displayName": "Canada"}, "score": "1"},
                {"homeAway": "away", "team": {"displayName": "Bosnia-Herzegovina"}, "score": "1"},
            ],
        }
    ],
}


def test_find_known_score_canada_bosnia():
    known = find_known_score("2026-06-12", "Canada", "Bosnia and Herzegovina")
    assert known is not None
    assert known["score"]["ft"] == [1, 1]
    assert known["score"]["ht"] == [0, 1]


def test_known_score_for_bosnia_alias():
    score = known_score_for_teams("2026-06-12", "Canada", "Bosnia & Herzegovina")
    assert score == {"ft": [1, 1], "ht": [0, 1]}


def test_parse_scoreboard_event_includes_scores():
    parsed = EspnCommentaryClient("test-agent", delay=0).parse_scoreboard_event(CANADA_BOSNIA_EVENT)
    assert parsed["home_score"] == 1
    assert parsed["away_score"] == 1
    assert parsed["status_state"] == "post"
    assert parsed["status_completed"] is True


def test_score_from_espn_maps_home_and_away():
    class Team:
        def __init__(self, name: str):
            self.name = name

    class Match:
        team1 = Team("Canada")
        team2 = Team("Bosnia and Herzegovina")

    score = LiveScoreService._score_from_espn(
        Match(),
        {
            "home_team": "Canada",
            "away_team": "Bosnia-Herzegovina",
            "home_score": 1,
            "away_score": 1,
        },
    )
    assert score == {"ft": [1, 1]}


def test_match_needs_updates_during_live_window():
    class Team:
        def __init__(self, name: str):
            self.name = name

    class Match:
        match_date = date(2026, 6, 12)
        match_time = "15:00 UTC-4"
        team1 = Team("Canada")
        team2 = Team("Bosnia and Herzegovina")
        score = None

    service = LiveScoreService()
    during_match = datetime(2026, 6, 12, 20, 0, tzinfo=timezone.utc)
    before_window = datetime(2026, 6, 12, 18, 30, tzinfo=timezone.utc)
    assert service._match_needs_updates(Match(), during_match)
    assert not service._match_needs_updates(Match(), before_window)

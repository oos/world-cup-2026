from app.ingestion.espn_commentary_client import EspnCommentaryClient


def test_parse_commentary_marks_key_events():
    summary = {
        "commentary": [
            {
                "sequence": 0,
                "time": {"value": 0.0, "displayValue": ""},
                "text": "First Half begins.",
            },
            {
                "sequence": 1,
                "time": {"value": 23.0, "displayValue": "23'"},
                "text": "Goal! Argentina 1, France 0. Lionel Messi (Argentina) converts the penalty.",
            },
        ],
        "keyEvents": [
            {
                "text": "First Half begins.",
                "type": {"text": "Kickoff"},
                "period": {"number": 1},
            }
        ],
    }

    events = EspnCommentaryClient("test-agent", delay=0).parse_commentary(summary)
    assert len(events) == 2
    assert events[0]["is_key_event"] is True
    assert events[0]["event_type"] == "Kickoff"
    assert events[1]["is_key_event"] is False


def test_parse_scoreboard_event():
    client = EspnCommentaryClient("test-agent", delay=0)
    parsed = client.parse_scoreboard_event(
        {
            "id": "633850",
            "date": "2022-12-18T15:00:00Z",
            "season": {"year": 2022},
            "competitions": [
                {
                    "date": "2022-12-18T15:00:00Z",
                    "competitors": [
                        {"homeAway": "home", "team": {"displayName": "Argentina"}},
                        {"homeAway": "away", "team": {"displayName": "France"}},
                    ],
                }
            ],
        }
    )
    assert parsed["espn_game_id"] == "633850"
    assert parsed["home_team"] == "Argentina"
    assert parsed["away_team"] == "France"
    assert parsed["year"] == 2022
    assert parsed["home_score"] is None
    assert parsed["away_score"] is None

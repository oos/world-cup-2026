from app.ingestion.live_status import (
    format_live_display,
    parse_api_football_live_status,
    parse_espn_live_status,
)


def test_parse_espn_live_status_second_half():
    live = parse_espn_live_status(
        {
            "status": {
                "clock": 4020.0,
                "displayClock": "67'",
                "period": 2,
                "type": {
                    "name": "STATUS_SECOND_HALF",
                    "state": "in",
                    "shortDetail": "67'",
                },
            }
        }
    )
    assert live == {
        "period": "2H",
        "minute": 67,
        "added": None,
        "display": "67'",
        "state": "in",
    }


def test_parse_espn_live_status_stoppage_time():
    live = parse_espn_live_status(
        {
            "status": {
                "displayClock": "90'+4",
                "period": 2,
                "type": {
                    "name": "STATUS_SECOND_HALF",
                    "state": "in",
                    "shortDetail": "90'+4",
                },
            }
        }
    )
    assert live["minute"] == 90
    assert live["added"] == 4
    assert live["display"] == "90'+4"


def test_parse_espn_live_status_prefers_clock_when_display_lags():
    live = parse_espn_live_status(
        {
            "status": {
                "clock": 4020.0,
                "displayClock": "65'",
                "period": 2,
                "type": {
                    "name": "STATUS_SECOND_HALF",
                    "state": "in",
                    "shortDetail": "65'",
                },
            }
        }
    )
    assert live["minute"] == 67
    assert live["display"] == "67'"


def test_parse_espn_live_status_halftime():
    live = parse_espn_live_status(
        {
            "status": {
                "displayClock": "45'",
                "period": 1,
                "type": {
                    "name": "STATUS_HALFTIME",
                    "state": "in",
                    "shortDetail": "Half",
                },
            }
        }
    )
    assert live["period"] == "HT"
    assert live["state"] == "in"


def test_parse_api_football_live_status_extra_time():
    live = parse_api_football_live_status(
        {
            "short": "ET",
            "elapsed": 105,
            "extra": 1,
        }
    )
    assert live == {
        "period": "ET",
        "minute": 105,
        "added": 1,
        "display": "ET 105'+1",
        "state": "in",
    }


def test_format_live_display_penalties():
    assert format_live_display("P", None, None) == "Penalties"


def test_parse_clock_display_stoppage():
    from app.ingestion.live_status import _parse_clock_display

    assert _parse_clock_display("45'+5'") == (45, 5)
    assert _parse_clock_display("90'+4") == (90, 4)


def test_merge_goals_keeps_existing_when_incoming_is_partial():
    from app.ingestion.score_merge import merge_goals

    existing = [{"name": "Harry Kane", "minute": 12, "penalty": True}]
    incoming = [{"name": "Harry Kane", "minute": 42}]
    merged = merge_goals(existing, incoming)
    assert merged == [
        {"name": "Harry Kane", "minute": 12, "penalty": True},
        {"name": "Harry Kane", "minute": 42},
    ]


def test_apply_score_update_merges_live_without_changing_ft():
    from app.ingestion.score_merge import apply_score_update

    class Match:
        def __init__(self):
            self.score = {"ft": [1, 0]}
            self.goals1 = []
            self.goals2 = []
            self.data_sources = {}

    match = Match()
    changed = apply_score_update(
        match,
        {
            "ft": [1, 0],
            "live": {
                "period": "2H",
                "minute": 67,
                "added": None,
                "display": "67'",
                "state": "in",
            },
        },
        source="espn",
        status="in",
    )
    assert changed is True
    assert match.score["ft"] == [1, 0]
    assert match.score["live"]["display"] == "67'"

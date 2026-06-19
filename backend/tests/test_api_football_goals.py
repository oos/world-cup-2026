from app.ingestion.score_providers.api_football import parse_fixture_goal_events


def test_parse_fixture_goal_events_maps_home_and_away():
    class Team:
        fifa_code = "MEX"
        name = "Mexico"

    class Team2:
        fifa_code = "RSA"
        name = "South Africa"

    class Match:
        team1 = Team()
        team2 = Team2()

    row = {
        "teams": {
            "home": {"id": 1, "name": "Mexico", "code": "MEX"},
            "away": {"id": 2, "name": "South Africa", "code": "RSA"},
        }
    }
    events = [
        {
            "type": "Goal",
            "detail": "Normal Goal",
            "team": {"id": 1, "name": "Mexico"},
            "player": {"name": "Julian Quinones"},
            "time": {"elapsed": 9, "extra": None},
        },
        {
            "type": "Goal",
            "detail": "Normal Goal",
            "team": {"id": 1, "name": "Mexico"},
            "player": {"name": "Raul Jimenez"},
            "assist": {"name": "Orbelin Pineda"},
            "time": {"elapsed": 67, "extra": None},
        },
    ]

    goals1, goals2 = parse_fixture_goal_events(events, row, Match())
    assert goals1 == [
        {"name": "Julian Quinones", "minute": 9},
        {"name": "Raul Jimenez", "minute": 67, "assist": "Orbelin Pineda"},
    ]
    assert goals2 == []

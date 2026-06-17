from app.ingestion.score_providers.api_football import parse_fixture_score


def test_parse_fixture_score_maps_home_and_away_to_team1():
    class Team:
        def __init__(self, name: str, code: str):
            self.name = name
            self.fifa_code = code

    class Match:
        team1 = Team("Mexico", "MEX")
        team2 = Team("South Africa", "RSA")

    row = {
        "fixture": {"status": {"short": "FT"}},
        "teams": {
            "home": {"name": "Mexico", "code": "MEX"},
            "away": {"name": "South Africa", "code": "RSA"},
        },
        "goals": {"home": 2, "away": 0},
        "score": {"halftime": {"home": 1, "away": 0}, "fulltime": {"home": 2, "away": 0}},
    }

    update = parse_fixture_score(row, Match())
    assert update is not None
    assert update.score == {"ft": [2, 0], "ht": [1, 0]}
    assert update.source == "api_football"
    assert update.status == "ft"

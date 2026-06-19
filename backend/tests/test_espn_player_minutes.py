from app.ingestion.espn_player_minutes import parse_espn_player_minutes


def test_parse_espn_player_minutes_from_substitutions():
    class Team:
        name = "Mexico"
        fifa_code = "MEX"

    class Team2:
        name = "South Africa"
        fifa_code = "RSA"

    class Match:
        team1 = Team()
        team2 = Team2()

    summary = {
        "keyEvents": [
            {
                "type": {"text": "Substitution"},
                "team": {"displayName": "South Africa"},
                "participants": [
                    {"athlete": {"displayName": "Thalente Mbatha"}},
                    {"athlete": {"displayName": "Lyle Foster"}},
                ],
                "clock": {"displayValue": "56'"},
            },
            {
                "type": {"text": "Goal"},
                "team": {"displayName": "Mexico"},
                "clock": {"displayValue": "90'+7'"},
            },
        ],
        "rosters": [
            {
                "homeAway": "home",
                "team": {"displayName": "Mexico"},
                "roster": [
                    {
                        "starter": True,
                        "athlete": {"displayName": "Julián Quiñones"},
                    },
                    {
                        "starter": False,
                        "athlete": {"displayName": "Unused Sub"},
                    },
                ],
            },
            {
                "homeAway": "away",
                "team": {"displayName": "South Africa"},
                "roster": [
                    {
                        "starter": True,
                        "athlete": {"displayName": "Lyle Foster"},
                    },
                    {
                        "starter": False,
                        "athlete": {"displayName": "Thalente Mbatha"},
                    },
                ],
            },
        ],
    }

    minutes1, minutes2 = parse_espn_player_minutes(summary, Match())
    assert minutes1 == [{"name": "Julián Quiñones", "minutes": 97}]
    assert minutes2 == [
        {"name": "Lyle Foster", "minutes": 56},
        {"name": "Thalente Mbatha", "minutes": 41},
    ]

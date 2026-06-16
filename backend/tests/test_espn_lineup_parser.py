from app.ingestion.espn_commentary_client import EspnCommentaryClient


def test_parse_lineups_extracts_starters_and_formation():
    summary = {
        "rosters": [
            {
                "homeAway": "home",
                "formation": "4-3-3",
                "team": {"displayName": "Argentina"},
                "roster": [
                    {
                        "starter": True,
                        "jersey": "23",
                        "position": {"abbreviation": "G", "name": "Goalkeeper"},
                        "athlete": {"id": "158626", "displayName": "Emiliano Martínez"},
                    },
                    {
                        "starter": False,
                        "jersey": "12",
                        "position": {"abbreviation": "G", "name": "Goalkeeper"},
                        "athlete": {"id": "999", "displayName": "Backup Keeper"},
                    },
                ],
            },
            {
                "homeAway": "away",
                "formation": "4-2-3-1",
                "team": {"displayName": "France"},
                "roster": [
                    {
                        "starter": True,
                        "jersey": "1",
                        "position": {"abbreviation": "G"},
                        "athlete": {"id": "43372", "displayName": "Hugo Lloris"},
                    }
                ],
            },
        ]
    }

    lineups = EspnCommentaryClient("test-agent", delay=0).parse_lineups(summary)
    assert len(lineups) == 2

    home = lineups[0]
    assert home["home_away"] == "home"
    assert home["team_name"] == "Argentina"
    assert home["formation"] == "4-3-3"
    assert home["players"][0]["display_name"] == "Emiliano Martínez"
    assert home["players"][0]["jersey_number"] == 23
    assert home["players"][0]["starter"] is True
    assert home["players"][1]["starter"] is False

    away = lineups[1]
    assert away["team_name"] == "France"
    assert away["formation"] == "4-2-3-1"


def test_parse_lineups_returns_empty_when_missing():
    assert EspnCommentaryClient("test-agent", delay=0).parse_lineups({}) == []

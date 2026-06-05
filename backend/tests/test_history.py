import json

from app.services.history_service import HistoryService


def test_list_matches_filters_by_year(tmp_path):
    cache_path = tmp_path / "history_cache.json"
    cache_path.write_text(
        json.dumps(
            {
                "synced_at": "2026-01-01T00:00:00",
                "tournaments": [
                    {"year": 2022, "name": "FIFA World Cup 2022", "match_count": 2},
                    {"year": 2018, "name": "FIFA World Cup 2018", "match_count": 1},
                ],
                "matches": [
                    {
                        "year": 2022,
                        "round": "Final",
                        "match_number": 64,
                        "date": "2022-12-18",
                        "time": "18:00",
                        "group": None,
                        "team1": "Argentina",
                        "team2": "France",
                        "stadium": "Lusail Stadium",
                        "score": {"ft": [3, 3]},
                    },
                    {
                        "year": 2022,
                        "round": "Matchday 1",
                        "match_number": 1,
                        "date": "2022-11-20",
                        "time": "19:00",
                        "group": "Group A",
                        "team1": "Qatar",
                        "team2": "Ecuador",
                        "stadium": "Al Bayt Stadium",
                        "score": {"ft": [0, 2]},
                    },
                    {
                        "year": 2018,
                        "round": "Final",
                        "match_number": 64,
                        "date": "2018-07-15",
                        "time": "18:00",
                        "group": None,
                        "team1": "France",
                        "team2": "Croatia",
                        "stadium": "Luzhniki Stadium",
                        "score": {"ft": [4, 2]},
                    },
                ],
            }
        )
    )

    service = HistoryService(cache_path=cache_path)

    assert len(service.list_tournaments()) == 2
    assert len(service.list_matches()) == 3
    assert len(service.list_matches(year=2022)) == 2
    assert service.list_matches(year=2022, round_name="Final")[0]["team1"] == "Argentina"


def test_list_teams_for_year(tmp_path):
    cache_path = tmp_path / "history_cache.json"
    cache_path.write_text(
        json.dumps(
            {
                "synced_at": "2026-01-01T00:00:00",
                "tournaments": [{"year": 2022, "name": "FIFA World Cup 2022", "match_count": 2}],
                "matches": [
                    {
                        "year": 2022,
                        "round": "Matchday 1",
                        "match_number": 1,
                        "date": "2022-11-20",
                        "time": "19:00",
                        "group": "Group A",
                        "team1": "Qatar",
                        "team2": "Ecuador",
                        "stadium": "Al Bayt Stadium",
                        "score": {"ft": [0, 2]},
                    },
                    {
                        "year": 2022,
                        "round": "Final",
                        "match_number": 64,
                        "date": "2022-12-18",
                        "time": "18:00",
                        "group": None,
                        "team1": "Argentina",
                        "team2": "France",
                        "stadium": "Lusail Stadium",
                        "score": {"ft": [3, 3]},
                    },
                ],
            }
        )
    )

    service = HistoryService(cache_path=cache_path)
    teams = service.list_teams(2022)

    assert [t["name"] for t in teams] == ["Argentina", "Ecuador", "France", "Qatar"]
    assert teams[0]["group"] is None
    assert teams[3]["group"] == "Group A"

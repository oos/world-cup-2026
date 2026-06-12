from app.services.history_service import HistoryService
from tests.history_fixtures import seed_history_matches


def test_list_matches_filters_by_year(app):
    seed_history_matches(
        [
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
        ]
    )

    service = HistoryService()

    assert len(service.list_tournaments()) == 2
    assert len(service.list_matches()) == 3
    assert len(service.list_matches(year=2022)) == 2
    assert service.list_matches(year=2022, round_name="Final")[0]["team1"] == "Argentina"


def test_list_matches_bootstraps_from_db(app, monkeypatch):
    def fake_fetch_year(self, year: int) -> list[dict]:
        if year != 2022:
            return []
        return [
            {
                "year": year,
                "round": "Final",
                "date": f"{year}-07-01",
                "team1": "Argentina",
                "team2": "France",
                "score": {"ft": [1, 0]},
            }
        ]

    monkeypatch.setattr(HistoryService, "_fetch_year", fake_fetch_year)
    monkeypatch.setattr(
        "app.services.history_service.GoalEnrichmentService.load_goals",
        lambda self: [],
    )
    monkeypatch.setattr(
        "app.services.history_service.GoalEnrichmentService.prepare",
        lambda self, goals: None,
    )

    service = HistoryService()
    result = service.sync_history()

    assert result["matches"] > 0
    assert len(service.list_matches()) > 0


def test_list_teams_for_year(app):
    seed_history_matches(
        [
            {
                "year": 2022,
                "round": "Matchday 1",
                "match_number": 1,
                "date": "2022-11-20",
                "team1": "Qatar",
                "team2": "Ecuador",
                "group": "Group A",
                "score": {"ft": [0, 2]},
            },
            {
                "year": 2022,
                "round": "Final",
                "match_number": 64,
                "date": "2022-12-18",
                "team1": "Argentina",
                "team2": "France",
                "score": {"ft": [3, 3]},
            },
        ]
    )

    service = HistoryService()
    teams = service.list_teams(2022)

    assert [t["name"] for t in teams] == ["Argentina", "Ecuador", "France", "Qatar"]
    assert teams[0]["group"] is None
    assert teams[3]["group"] == "Group A"


def test_get_match_detail_by_key(app):
    seed_history_matches(
        [
            {
                "year": 2022,
                "round": "Final",
                "match_number": 64,
                "date": "2022-12-18",
                "team1": "Argentina",
                "team2": "France",
                "stadium": "Lusail Stadium",
                "score": {"ft": [3, 3], "ht": [2, 0]},
                "goals1": [{"name": "Lionel Messi", "minute": 23}],
                "goals2": [{"name": "Kylian Mbappé", "minute": 80}],
            }
        ]
    )

    service = HistoryService()
    match_key = service.build_match_key(service.list_matches(year=2022)[0])
    detail = service.get_match_detail(2022, match_key)

    assert detail is not None
    assert detail["match_key"] == "2022-12-18-argentina-vs-france"
    assert detail["team1"] == "Argentina"
    assert detail["team2"] == "France"
    assert detail["team1_score"] == 3
    assert detail["team2_score"] == 3
    assert detail["half_time_score"] == {"team1": 2, "team2": 0}
    assert detail["team1_goals"][0]["name"] == "Lionel Messi"
    assert service.get_match_detail(2022, "missing-key") is None

from app.ingestion.known_scores import apply_known_score, find_known_score, known_score_for_teams
from app.services.history_service import HistoryService


def test_find_known_score_matchday_1_results():
    mexico = find_known_score("2026-06-11", "Mexico", "South Africa")
    assert mexico is not None
    assert mexico["score"]["ft"] == [2, 0]
    assert mexico["score"]["ht"] == [1, 0]

    korea = find_known_score("2026-06-11", "South Korea", "Czech Republic")
    assert korea is not None
    assert korea["score"]["ft"] == [2, 1]


def test_known_score_matches_team_aliases():
    score = known_score_for_teams("2026-06-11", "South Korea", "Czechia")
    assert score == {"ft": [2, 1], "ht": [0, 0]}


def test_find_known_score_canada_bosnia():
    known = find_known_score("2026-06-12", "Canada", "Bosnia and Herzegovina")
    assert known is not None
    assert known["score"]["ft"] == [1, 1]


def test_apply_known_score_enriches_history_match():
    match = apply_known_score(
        {
            "year": 2026,
            "round": "Matchday 1",
            "date": "2026-06-11",
            "team1": "Mexico",
            "team2": "South Africa",
            "score": None,
            "goals1": [],
            "goals2": [],
        }
    )

    assert match["score"]["ft"] == [2, 0]
    assert len(match["goals1"]) == 2
    assert match["goals2"] == []


def test_history_service_applies_known_scores_at_sync(app, monkeypatch):
    def fake_fetch_year(self, year: int) -> list[dict]:
        if year != 2026:
            return []
        return [
            {
                "year": 2026,
                "round": "Matchday 1",
                "date": "2026-06-11",
                "team1": "Mexico",
                "team2": "South Africa",
                "score": None,
            },
            {
                "year": 2026,
                "round": "Matchday 1",
                "date": "2026-06-11",
                "team1": "South Korea",
                "team2": "Czech Republic",
                "score": None,
            },
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
    service.sync_history()
    matches = service.list_matches(year=2026, round_name="Matchday 1")

    assert len(matches) == 2
    assert matches[0]["score"]["ft"] == [2, 0]
    assert matches[1]["score"]["ft"] == [2, 1]

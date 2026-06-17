from app.ingestion.known_scores import apply_known_score, find_known_score, known_score_for_teams
from app.extensions import db
from app.models.nation import Nation
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.services.history_service import HistoryService
from app.services.match_upsert_service import MatchUpsertService


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
    from datetime import date

    tournament = Tournament(name="World Cup 2026", year=2026, external_key="world-cup-2026")
    db.session.add(tournament)
    db.session.flush()

    nations = [
        Nation(name="Mexico", fifa_code="MEX", aliases=[]),
        Nation(name="South Africa", fifa_code="RSA", aliases=[]),
        Nation(name="South Korea", fifa_code="KOR", aliases=[]),
        Nation(name="Czech Republic", fifa_code="CZE", aliases=[]),
    ]
    db.session.add_all(nations)
    db.session.flush()

    teams = [
        TournamentTeam(tournament_id=tournament.id, nation_id=nations[0].id),
        TournamentTeam(tournament_id=tournament.id, nation_id=nations[1].id),
        TournamentTeam(tournament_id=tournament.id, nation_id=nations[2].id),
        TournamentTeam(tournament_id=tournament.id, nation_id=nations[3].id),
    ]
    db.session.add_all(teams)
    db.session.flush()

    upsert = MatchUpsertService()
    upsert.upsert_from_openfootball(
        tournament,
        round_name="Matchday 1",
        match_number=1,
        match_date=date(2026, 6, 11),
        match_time="13:00 UTC-6",
        group_name="Group A",
        team1=teams[0],
        team2=teams[1],
        team1_name="Mexico",
        team2_name="South Africa",
        stadium_id=None,
        score=None,
    )
    upsert.upsert_from_openfootball(
        tournament,
        round_name="Matchday 1",
        match_number=2,
        match_date=date(2026, 6, 11),
        match_time="18:00 UTC-4",
        group_name="Group B",
        team1=teams[2],
        team2=teams[3],
        team1_name="South Korea",
        team2_name="Czech Republic",
        stadium_id=None,
        score=None,
    )
    db.session.commit()

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

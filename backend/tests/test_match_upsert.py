from datetime import date
from unittest.mock import patch

from sqlalchemy import select

from app.extensions import db
from app.models.match import Match
from app.models.nation import Nation
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.services.history_service import HistoryService
from app.services.match_upsert_service import MatchUpsertService


def _seed_2026_teams(tournament: Tournament) -> tuple[TournamentTeam, TournamentTeam]:
    mexico = Nation(name="Mexico", fifa_code="MEX", aliases=[])
    south_africa = Nation(name="South Africa", fifa_code="RSA", aliases=[])
    db.session.add_all([mexico, south_africa])
    db.session.flush()

    team1 = TournamentTeam(tournament_id=tournament.id, nation_id=mexico.id, group_name="Group A")
    team2 = TournamentTeam(
        tournament_id=tournament.id, nation_id=south_africa.id, group_name="Group A"
    )
    db.session.add_all([team1, team2])
    db.session.flush()
    return team1, team2


def test_openfootball_and_history_share_single_row(app):
    tournament = Tournament(name="World Cup 2026", year=2026, external_key="world-cup-2026")
    db.session.add(tournament)
    db.session.flush()

    team1, team2 = _seed_2026_teams(tournament)
    upsert = MatchUpsertService()

    upsert.upsert_from_openfootball(
        tournament,
        round_name="Matchday 1",
        match_number=1,
        match_date=date(2026, 6, 11),
        match_time="13:00 UTC-6",
        group_name="Group A",
        team1=team1,
        team2=team2,
        team1_name="Mexico",
        team2_name="South Africa",
        stadium_id=None,
        score=None,
    )
    db.session.commit()

    history = HistoryService()

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
                "score": {"ft": [2, 0], "ht": [1, 0]},
                "goals1": [{"name": "Test", "minute": 9}],
                "goals2": [],
            }
        ]

    with patch.object(HistoryService, "_fetch_year", fake_fetch_year):
        with patch(
            "app.services.history_service.GoalEnrichmentService.load_goals",
            lambda self: [],
        ):
            with patch(
                "app.services.history_service.GoalEnrichmentService.prepare",
                lambda self, goals: None,
            ):
                history.sync_history()

    matches = list(db.session.scalars(select(Match)).all())
    assert len(matches) == 1
    assert matches[0].score == {"ft": [2, 0], "ht": [1, 0]}
    assert matches[0].match_key == "2026-06-11-mexico-vs-south-africa"

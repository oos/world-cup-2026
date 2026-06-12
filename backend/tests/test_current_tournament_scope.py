from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.models.match import Match
from app.models.tournament import Tournament
from app.services.squad_service import SquadService
from tests.history_fixtures import seed_nation, seed_tournament_team


def _seed_tournament(year: int) -> Tournament:
    tournament = Tournament(
        name=f"World Cup {year}",
        year=year,
        external_key=f"world-cup-{year}",
    )
    db.session.add(tournament)
    db.session.flush()
    return tournament


def test_list_teams_scoped_to_current_tournament(app):
    t2026 = _seed_tournament(CURRENT_TOURNAMENT_YEAR)
    t2022 = _seed_tournament(2022)
    arg2026 = seed_nation(name="Argentina", fifa_code="ARG")
    arg2022 = seed_nation(name="Argentina", fifa_code="ARG-HIST")
    seed_tournament_team(tournament=t2026, nation=arg2026, group_name="Group A")
    seed_tournament_team(tournament=t2022, nation=arg2022, group_name="Group C")
    db.session.commit()

    teams = SquadService().list_teams()
    assert len(teams) == 1
    assert teams[0]["fifa_code"] == "ARG"
    assert teams[0]["group"] == "Group A"


def test_get_stats_scoped_to_current_tournament(app):
    t2026 = _seed_tournament(CURRENT_TOURNAMENT_YEAR)
    t2022 = _seed_tournament(2022)
    usa2026 = seed_nation(name="United States", fifa_code="USA")
    usa2022 = seed_nation(name="United States", fifa_code="USA-HIST")
    seed_tournament_team(tournament=t2026, nation=usa2026, group_name="Group D")
    seed_tournament_team(tournament=t2022, nation=usa2022, group_name="Group B")
    db.session.commit()

    stats = SquadService().get_stats()
    assert stats["team_count"] == 1
    assert stats["groups"] == ["Group D"]


def test_list_matches_scoped_to_current_tournament(app):
    from app.services.match_service import MatchService

    t2026 = _seed_tournament(CURRENT_TOURNAMENT_YEAR)
    t2022 = _seed_tournament(2022)
    db.session.add_all(
        [
            Match(tournament_id=t2026.id, round="Matchday 1", match_key="2026-a"),
            Match(tournament_id=t2022.id, round="Final", match_key="2022-a"),
            Match(tournament_id=t2022.id, round="Group A", match_key="2022-b"),
        ]
    )
    db.session.commit()

    matches = MatchService().list_matches()
    assert len(matches) == 1
    assert matches[0]["round"] == "Matchday 1"

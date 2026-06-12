from app.extensions import db
from app.ingestion import IngestionService
from app.models.player import Player
from app.models.squad_member import SquadMember
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from tests.history_fixtures import seed_nation, seed_tournament_team


def test_cleanup_invalid_players(app):
    tournament = Tournament(name="World Cup 2026", year=2026, external_key="world-cup-2026")
    db.session.add(tournament)
    db.session.flush()
    nation = seed_nation(name="Uzbekistan", fifa_code="UZB")
    team = seed_tournament_team(tournament=tournament, nation=nation, group_name="Group A")
    valid = Player(name="Eldor Shomurodov", position="FWD")
    junk = Player(name="Privacy Policy", position="FWD")
    db.session.add_all([valid, junk])
    db.session.flush()
    db.session.add_all(
        [
            SquadMember(team_id=team.id, player_id=valid.id),
            SquadMember(team_id=team.id, player_id=junk.id),
        ]
    )
    db.session.commit()

    results = IngestionService().cleanup_invalid_players()
    assert results["removed"] == 1
    assert db.session.get(Player, junk.id) is None
    assert db.session.get(Player, valid.id) is not None

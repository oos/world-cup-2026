from app.extensions import db
from app.models.player import Player
from app.repositories.player_repository import PlayerRepository
from app.utils.club_status import CLUB_STATUS_NONE, CLUB_STATUS_UNAVAILABLE


def test_players_missing_club_excludes_confirmed_none(app):
    repo = PlayerRepository()
    with_club = Player(name="With Club", club="Arsenal")
    missing = Player(name="Missing", club=None, club_status=CLUB_STATUS_UNAVAILABLE)
    confirmed_none = Player(name="Free Agent", club=None, club_status=CLUB_STATUS_NONE)
    db.session.add_all([with_club, missing, confirmed_none])
    db.session.commit()

    results = repo.players_missing_club()

    assert [player.name for player in results] == ["Missing"]

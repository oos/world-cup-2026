import pytest

from app.extensions import db
from app.models.player import Player
from app.models.saved_item import SavedItem
from app.models.nation import Nation
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.services.auth_service import AuthService
from tests.test_auth import _extract_token


@pytest.fixture
def auth_service(app):
    return AuthService(app)


@pytest.fixture
def signed_in_client(client, auth_service):
    callback_url = auth_service.create_magic_link("saved@example.com")
    token = _extract_token(callback_url)
    client.post("/api/v1/auth/verify", json={"token": token})
    return client


@pytest.fixture
def sample_team(app):
    with app.app_context():
        tournament = Tournament(
            year=2026,
            name="FIFA World Cup 2026",
            external_key="world-cup-2026-test",
        )
        db.session.add(tournament)
        db.session.flush()
        nation = Nation(name="Brazil", fifa_code="BRA", flag_iso="br", aliases=[])
        db.session.add(nation)
        db.session.flush()
        team = TournamentTeam(
            tournament_id=tournament.id,
            nation_id=nation.id,
            group_name="D",
        )
        db.session.add(team)
        db.session.commit()
        return team.id


@pytest.fixture
def sample_player(app):
    with app.app_context():
        player = Player(name="Sample Player", position="FWD")
        db.session.add(player)
        db.session.commit()
        return player.id


def test_saved_items_requires_auth(client):
    response = client.get("/api/v1/auth/saved")
    assert response.status_code == 401


def test_add_list_and_remove_saved_items(
    signed_in_client,
    sample_team,
    sample_player,
):
    add_team = signed_in_client.post(
        "/api/v1/auth/saved",
        json={"item_type": "team", "item_id": sample_team},
    )
    assert add_team.status_code == 201
    team_payload = add_team.get_json()["item"]
    assert team_payload["item_type"] == "team"
    assert team_payload["item_id"] == sample_team
    assert team_payload["name"] == "Brazil"
    assert team_payload["fifa_code"] == "BRA"

    add_player = signed_in_client.post(
        "/api/v1/auth/saved",
        json={"item_type": "player", "item_id": sample_player},
    )
    assert add_player.status_code == 201
    player_payload = add_player.get_json()["item"]
    assert player_payload["item_type"] == "player"
    assert player_payload["name"] == "Sample Player"

    duplicate = signed_in_client.post(
        "/api/v1/auth/saved",
        json={"item_type": "team", "item_id": sample_team},
    )
    assert duplicate.status_code == 201
    assert duplicate.get_json()["item"]["item_id"] == sample_team

    listed = signed_in_client.get("/api/v1/auth/saved")
    assert listed.status_code == 200
    items = listed.get_json()["items"]
    assert len(items) == 2
    assert {item["item_type"] for item in items} == {"team", "player"}

    removed = signed_in_client.delete(f"/api/v1/auth/saved/team/{sample_team}")
    assert removed.status_code == 204

    remaining = signed_in_client.get("/api/v1/auth/saved")
    assert len(remaining.get_json()["items"]) == 1


def test_add_saved_item_rejects_unknown_team(signed_in_client):
    response = signed_in_client.post(
        "/api/v1/auth/saved",
        json={"item_type": "team", "item_id": 999999},
    )
    assert response.status_code == 400
    assert "not found" in response.get_json()["error"].lower()

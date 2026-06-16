from datetime import date, datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.ingestion.api_football_client import (
    ApiFootballBudgetError,
    ApiFootballClient,
    link_fixture_id,
)
from app.models.match import Match
from app.models.nation import Nation
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.repositories.match_repository import MatchRepository
from app.services.api_football_proof_sync_service import ApiFootballProofSyncService
from app.services.api_football_sync_service import ApiFootballSyncService


def test_link_fixture_id_matches_fifa_codes():
    fixtures = [
        {
            "fixture": {"id": 999, "date": "2022-12-18T15:00:00+00:00"},
            "teams": {
                "home": {"code": "ARG", "name": "Argentina"},
                "away": {"code": "FRA", "name": "France"},
            },
        }
    ]
    assert link_fixture_id(fixtures, team1_fifa="ARG", team2_fifa="FRA") == 999
    assert link_fixture_id(fixtures, team1_fifa="FRA", team2_fifa="ARG") == 999


def test_link_fixture_id_matches_team_names_when_codes_missing():
    fixtures = [
        {
            "fixture": {"id": 979139, "date": "2022-12-18T15:00:00+00:00"},
            "teams": {
                "home": {"code": None, "name": "Argentina"},
                "away": {"code": None, "name": "France"},
            },
        }
    ]
    assert link_fixture_id(
        fixtures,
        team1_fifa="ARG",
        team2_fifa="FRA",
        team1_name="Argentina",
        team2_name="France",
        match_date="2022-12-18",
    ) == 979139


def test_api_client_ensure_budget_raises():
    client = ApiFootballClient("test-key")
    client._remaining_daily = 3
    with pytest.raises(ApiFootballBudgetError):
        client.ensure_budget(2, reserve=5)


def test_api_client_parses_quota_headers():
    client = ApiFootballClient("test-key")
    response = MagicMock()
    response.headers = {
        "x-ratelimit-requests-remaining": "42",
        "X-Ratelimit-Remaining": "8",
    }
    client._update_quota_from_response(response)
    assert client.remaining_daily == 42
    assert client.remaining_minute == 8


def test_sync_service_skips_without_all_teams(app):
    with app.app_context():
        service = ApiFootballSyncService()
        results = service.sync(all_teams=False)
        assert results.get("skipped") is True


def test_sync_service_blocks_2026_when_proof_mode(app):
    app.config["API_FOOTBALL_PROOF_MODE"] = True
    app.config["API_FOOTBALL_KEY"] = "test-key"
    with app.app_context():
        service = ApiFootballSyncService()
        results = service.sync(all_teams=True, season=2026)
        assert results.get("skipped") is True
        assert "proof mode" in results.get("reason", "").lower()


def _seed_2022_final(app):
    with app.app_context():
        from app.extensions import db

        arg = Nation(name="Argentina", fifa_code="ARG", flag_iso="ar")
        fra = Nation(name="France", fifa_code="FRA", flag_iso="fr")
        db.session.add_all([arg, fra])
        db.session.flush()

        tournament = Tournament(name="FIFA World Cup 2022", year=2022, external_key="world-cup-2022")
        db.session.add(tournament)
        db.session.flush()

        team1 = TournamentTeam(tournament_id=tournament.id, nation_id=arg.id)
        team2 = TournamentTeam(tournament_id=tournament.id, nation_id=fra.id)
        db.session.add_all([team1, team2])
        db.session.flush()

        match = Match(
            tournament_id=tournament.id,
            round="Final",
            match_date=date(2022, 12, 18),
            match_time="15:00 UTC+0",
            team1_id=team1.id,
            team2_id=team2.id,
            match_key="2022-12-18-argentina-vs-france",
            score={"ft": [3, 3], "pens": [4, 2]},
        )
        db.session.add(match)
        db.session.commit()
        return match.id


def test_proof_sync_dry_run(app):
    _seed_2022_final(app)
    app.config["API_FOOTBALL_KEY"] = "test-key"
    app.config["API_FOOTBALL_PROOF_MODE"] = True
    with app.app_context():
        service = ApiFootballProofSyncService()
        results = service.run(dry_run=True)
        assert results.get("dry_run") is True
        assert results.get("season") == 2022
        assert results.get("match_key") == "2022-12-18-argentina-vs-france"
        assert results.get("estimated_requests", 0) > 0


def test_get_next_upcoming_orders_by_kickoff(app):
    with app.app_context():
        from app.extensions import db

        tournament = Tournament(name="FIFA World Cup 2026", year=2026, external_key="world-cup-2026")
        db.session.add(tournament)
        db.session.flush()

        arg = Nation(name="Argentina", fifa_code="ARG")
        mex = Nation(name="Mexico", fifa_code="MEX")
        db.session.add_all([arg, mex])
        db.session.flush()

        t1 = TournamentTeam(tournament_id=tournament.id, nation_id=arg.id)
        t2 = TournamentTeam(tournament_id=tournament.id, nation_id=mex.id)
        db.session.add_all([t1, t2])
        db.session.flush()

        later = Match(
            tournament_id=tournament.id,
            match_date=date(2026, 6, 20),
            match_time="18:00 UTC+0",
            team1_id=t1.id,
            team2_id=t2.id,
            match_key="later",
        )
        sooner = Match(
            tournament_id=tournament.id,
            match_date=date(2026, 6, 12),
            match_time="12:00 UTC+0",
            team1_id=t1.id,
            team2_id=t2.id,
            match_key="sooner",
        )
        db.session.add_all([later, sooner])
        db.session.commit()

        repo = MatchRepository()
        now = datetime(2026, 6, 1, tzinfo=timezone.utc)
        next_match = repo.get_next_upcoming(tournament_year=2026, now=now)
        assert next_match is not None
        assert next_match.match_key == "sooner"


def test_proof_sync_persists_data_sources(app):
    match_id = _seed_2022_final(app)
    app.config["API_FOOTBALL_KEY"] = "test-key"
    app.config["API_FOOTBALL_PROOF_MODE"] = True

    mock_client = MagicMock()
    mock_client.request_count = 5
    mock_client.remaining_daily = 95
    mock_client.quota_summary.return_value = {
        "requests_used": 5,
        "remaining_daily": 95,
        "remaining_minute": None,
    }
    mock_client.fetch_teams.return_value = [
        {"team": {"id": 26, "code": "ARG", "name": "Argentina"}},
        {"team": {"id": 2, "code": "FRA", "name": "France"}},
    ]
    mock_client.fetch_fixtures.return_value = [
        {
            "fixture": {"id": 855736, "date": "2022-12-18T15:00:00+00:00"},
            "teams": {
                "home": {"code": None, "name": "Argentina"},
                "away": {"code": None, "name": "France"},
            },
        }
    ]
    mock_client.fetch_team_squad.return_value = [
        {
            "id": 19599,
            "name": "L. Messi",
            "number": 10,
            "position": "Attacker",
            "photo": "https://example.com/messi.png",
        }
    ]
    mock_client.fetch_injuries.return_value = [{"player": {"name": "Test"}}]
    mock_client.fetch_predictions.return_value = [{"predictions": {"advice": "Win"}}]
    mock_client.fetch_headtohead.return_value = []
    mock_client.fetch_fixture_lineups.return_value = [{"formation": "4-3-3"}]
    mock_client.ensure_budget.return_value = None

    with app.app_context():
        service = ApiFootballProofSyncService()
        with patch(
            "app.services.api_football_proof_sync_service.ApiFootballClient",
            return_value=mock_client,
        ):
            results = service.run()

        from app.extensions import db

        match = db.session.get(Match, match_id)
        assert match.api_football_fixture_id == 855736
        assert match.data_sources.get("proof_mode") is True
        assert match.data_sources.get("preview", {}).get("injuries")
        assert results.get("fixture_id") == 855736


def test_history_api_football_block(app, client):
    _seed_2022_final(app)
    with app.app_context():
        from app.extensions import db

        match = db.session.scalars(
            db.select(Match).where(Match.match_key == "2022-12-18-argentina-vs-france")
        ).first()
        match.data_sources = {
            "proof_mode": True,
            "enriched_at": "2026-06-16T12:00:00Z",
            "requests_used": 10,
            "preview": {
                "injuries": [],
                "predictions": [],
                "head_to_head": [],
                "lineups": [],
                "synced_at": "2026-06-16T12:00:00Z",
            },
        }
        match.api_football_fixture_id = 855736
        db.session.commit()

    response = client.get("/api/v1/history/matches/2022/2022-12-18-argentina-vs-france")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload.get("api_football", {}).get("fixture_id") == 855736
    assert payload["api_football"]["proof_mode"] is True

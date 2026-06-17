from datetime import date
from unittest.mock import patch

import pytest

from app.data.competitions import competition_by_slug
from app.extensions import db
from app.ingestion.api_football_client import ApiFootballClient
from app.ingestion.api_football_fixture import (
    parse_api_fixture,
    parse_api_score,
    stage_and_group_from_round,
)
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.services.api_football_competition_backfill_service import (
    ApiFootballCompetitionBackfillService,
)
from app.services.competition_ingestion_service import CompetitionIngestionService
from app.services.match_upsert_service import MatchUpsertService


def test_parse_api_score_fulltime():
    row = {
        "goals": {"home": 2, "away": 1},
        "score": {"fulltime": {"home": 2, "away": 1}},
    }
    assert parse_api_score(row) == {"ft": [2, 1]}


def test_stage_and_group_from_round():
    assert stage_and_group_from_round("Regular Season - 12") == ("league", None)
    assert stage_and_group_from_round("Group A - 3") == ("group", "A")
    assert stage_and_group_from_round("League Stage - 5") == ("league_phase", None)
    assert stage_and_group_from_round("Quarter-finals") == ("quarter_final", None)


def test_parse_api_fixture_league_match():
    row = {
        "fixture": {"id": 1001, "date": "2024-01-15T15:00:00+00:00"},
        "league": {"round": "Regular Season - 20"},
        "teams": {
            "home": {"id": 33, "name": "Manchester United"},
            "away": {"id": 34, "name": "Chelsea"},
        },
        "goals": {"home": 1, "away": 0},
        "score": {"fulltime": {"home": 1, "away": 0}},
    }
    parsed = parse_api_fixture(row)
    assert parsed is not None
    assert parsed.fixture_id == 1001
    assert parsed.stage == "league"
    assert parsed.match_date == date(2024, 1, 15)
    assert parsed.score == {"ft": [1, 0]}


def test_fetch_fixtures_paginated():
    client = ApiFootballClient("test")

    def fake_get(path, params=None):
        client._request_count += 1
        page = (params or {}).get("page", 1)
        if page == 1:
            return {
                "response": [{"fixture": {"id": 1}}],
                "paging": {"current": 1, "total": 2},
            }
        return {
            "response": [{"fixture": {"id": 2}}],
            "paging": {"current": 2, "total": 2},
        }

    client.get = fake_get  # type: ignore[method-assign]
    items, _last_page, total = client.fetch_fixtures_paginated(league_id=39, season=2024)
    assert len(items) == 2
    assert total == 2
    assert client.request_count == 2


def test_backfill_dry_run_pilot_only(app):
    app.config["API_FOOTBALL_BACKFILL_ENABLED"] = True
    app.config["API_FOOTBALL_BACKFILL_PRIORITY"] = "pilot"
    app.config["API_FOOTBALL_BACKFILL_SEASON"] = 2024
    with app.app_context():
        service = ApiFootballCompetitionBackfillService()
        results = service.run(dry_run=True)
        slugs = [c["slug"] for c in results["competitions"]]
        assert "premier-league" in slugs
        assert "fa-cup" in slugs
        assert "bundesliga" not in slugs


def test_backfill_persists_state(app):
    app.config["API_FOOTBALL_KEY"] = "test-key"
    app.config["API_FOOTBALL_BACKFILL_ENABLED"] = True
    app.config["API_FOOTBALL_BACKFILL_PRIORITY"] = "pilot"
    app.config["API_FOOTBALL_COMPETITION_BUDGET"] = 2
    app.config["API_FOOTBALL_BACKFILL_SEASON"] = 2024

    comp = competition_by_slug("premier-league")
    assert comp is not None

    class FakeClient:
        def __init__(self):
            self.request_count = 0

        def ensure_budget(self, *_a, **_k):
            return None

        def fetch_league(self, **_k):
            self.request_count += 1
            return {"league": {"name": "Premier League", "logo": "http://logo"}}

        def fetch_teams(self, **_k):
            self.request_count += 1
            return [{"team": {"id": 33, "name": "Manchester United", "logo": "http://crest"}}]

        def fetch_fixtures_page(self, **_k):
            self.request_count += 1
            return [], 1, 1

        def fetch_team_squad(self, **_k):
            self.request_count += 1
            return []

        def quota_summary(self):
            return {"requests_used": self.request_count, "remaining_daily": 98}

        def close(self):
            pass

    fake_client = FakeClient()

    with app.app_context():
        ingestion = CompetitionIngestionService()
        tournament = ingestion.ensure_competition(comp)
        db.session.commit()

        service = ApiFootballCompetitionBackfillService()
        with patch(
            "app.services.api_football_competition_backfill_service.ApiFootballClient",
            return_value=fake_client,
        ):
            service.run(slug="premier-league", budget=2)
            db.session.commit()

        tournament = db.session.get(Tournament, tournament.id)
        state = (tournament.data_sources or {}).get("backfill") or {}
        assert "fetch_league" in (state.get("completed_steps") or [])


def test_backfill_skips_complete_competition(app):
    app.config["API_FOOTBALL_KEY"] = "test-key"
    app.config["API_FOOTBALL_BACKFILL_ENABLED"] = True
    app.config["API_FOOTBALL_BACKFILL_PRIORITY"] = "pilot"

    with app.app_context():
        comp = competition_by_slug("premier-league")
        assert comp
        ingestion = CompetitionIngestionService()
        tournament = ingestion.ensure_competition(comp)
        tournament.data_sources = {
            "api_football": {"league_id": 39, "season": 2024},
            "backfill": {
                "status": "complete",
                "completed_steps": [
                    "fetch_league",
                    "fetch_teams",
                    "fetch_fixtures",
                    "fetch_squads",
                ],
            },
        }
        db.session.commit()

        class FakeClient:
            request_count = 0

            def ensure_budget(self, *_a, **_k):
                return None

            def fetch_league(self, **_k):
                raise AssertionError("should not fetch complete competition")

            def quota_summary(self):
                return {}

            def close(self):
                pass

        fake_client = FakeClient()

        service = ApiFootballCompetitionBackfillService()
        with patch(
            "app.services.api_football_competition_backfill_service.ApiFootballClient",
            return_value=fake_client,
        ):
            results = service.run(slug="premier-league", budget=90)

        assert results["requests_used"] == 0


def test_upsert_from_api_football(app):
    with app.app_context():
        tournament = Tournament(name="Test", year=2024, external_key="test-league-upsert")
        db.session.add(tournament)
        db.session.flush()
        t1 = TournamentTeam(tournament_id=tournament.id, display_name="Home FC", short_code="HOM")
        t2 = TournamentTeam(tournament_id=tournament.id, display_name="Away FC", short_code="AWA")
        db.session.add_all([t1, t2])
        db.session.flush()

        parsed = parse_api_fixture(
            {
                "fixture": {"id": 555, "date": "2024-03-01T12:00:00+00:00"},
                "league": {"round": "Regular Season - 1"},
                "teams": {
                    "home": {"id": 1, "name": "Home FC"},
                    "away": {"id": 2, "name": "Away FC"},
                },
                "goals": {"home": 2, "away": 2},
                "score": {"fulltime": {"home": 2, "away": 2}},
            }
        )
        assert parsed
        upsert = MatchUpsertService()
        match = upsert.upsert_from_api_football(
            tournament,
            parsed,
            team1=t1,
            team2=t2,
            team1_name="Home FC",
            team2_name="Away FC",
        )
        db.session.commit()
        assert match.api_football_fixture_id == 555
        assert match.stage == "league"
        assert match.score["ft"] == [2, 2]

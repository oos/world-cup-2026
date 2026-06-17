from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.models.match import Match
from app.models.tournament import Tournament
from app.repositories.match_lineup_repository import MatchLineupRepository
from app.services.lineup_sync_service import LineupSyncService
from app.services.match_service import MatchService
from tests.history_fixtures import seed_nation, seed_tournament_team


def _seed_tournament(year: int = CURRENT_TOURNAMENT_YEAR) -> Tournament:
    tournament = Tournament(
        name=f"World Cup {year}",
        year=year,
        external_key=f"world-cup-{year}",
    )
    db.session.add(tournament)
    db.session.flush()
    return tournament


def _seed_match_with_teams(
    *,
    match_date: date,
    match_time: str,
) -> Match:
    tournament = _seed_tournament()
    team1 = seed_tournament_team(
        tournament=tournament,
        nation=seed_nation(name="Mexico", fifa_code="MEX"),
        group_name="Group A",
    )
    team2 = seed_tournament_team(
        tournament=tournament,
        nation=seed_nation(name="South Africa", fifa_code="RSA"),
        group_name="Group A",
    )
    match = Match(
        tournament_id=tournament.id,
        round="Matchday 1",
        match_date=match_date,
        match_time=match_time,
        team1_id=team1.id,
        team2_id=team2.id,
        match_key="test-lineup-match",
    )
    db.session.add(match)
    db.session.commit()
    return match


def test_collect_candidates_includes_match_in_pre_ko_window(app):
    kickoff = datetime(2026, 6, 11, 19, 0, tzinfo=timezone.utc)
    now = kickoff - timedelta(minutes=30)
    match = _seed_match_with_teams(
        match_date=kickoff.date(),
        match_time="13:00 UTC-6",
    )

    service = LineupSyncService()
    with patch("app.services.lineup_sync_service.datetime") as mock_datetime:
        mock_datetime.now.return_value = now
        mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
        candidates = service._collect_candidates(now, lead_minutes=60, post_ko_minutes=15)

    assert any(candidate.id == match.id for candidate in candidates)


def test_collect_candidates_skips_match_outside_window(app):
    kickoff = datetime(2026, 6, 11, 19, 0, tzinfo=timezone.utc)
    now = kickoff - timedelta(days=2)
    match = _seed_match_with_teams(
        match_date=kickoff.date(),
        match_time="13:00 UTC-6",
    )

    service = LineupSyncService()
    candidates = service._collect_candidates(now, lead_minutes=60, post_ko_minutes=15)
    assert all(candidate.id != match.id for candidate in candidates)


def test_match_service_returns_pending_status_before_lineups(app):
    kickoff = datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(hours=3)
    match_time = f"{kickoff.hour:02d}:{kickoff.minute:02d} UTC+0"
    match = _seed_match_with_teams(
        match_date=kickoff.date(),
        match_time=match_time,
    )

    data = MatchService().get_match(match.id)
    assert data is not None
    assert data["lineups"]["status"] == "pending"
    assert data["lineups"]["team1"] is None
    assert "predicted_lineups" not in data


def test_match_service_returns_available_when_stored_lineups_exist(app):
    kickoff = datetime.now(timezone.utc) + timedelta(hours=1)
    match = _seed_match_with_teams(
        match_date=kickoff.date(),
        match_time="12:00 UTC+0",
    )

    repo = MatchLineupRepository()
    starters = [
        {
            "player_id": None,
            "jersey_number": number,
            "position": "M",
            "lineup_role": "starter",
            "display_name": f"Player {number}",
        }
        for number in range(1, 12)
    ]
    repo.replace_lineup(
        match_id=match.id,
        team_id=match.team1_id,
        formation="4-3-3",
        source="espn",
        players=starters,
    )
    db.session.commit()

    data = MatchService().get_match(match.id)
    assert data is not None
    assert data["lineups"]["status"] == "available"
    assert data["lineups"]["team1"] is not None
    assert len(data["lineups"]["team1"]["players"]) == 11

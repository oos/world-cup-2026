from datetime import date

from app.extensions import db
from app.models.match import Match
from app.models.tournament import Tournament
from app.utils.match_dedup import dedupe_matches


def _seed_match(
    tournament_id: int,
    *,
    match_id: int | None = None,
    match_date: date,
    team1_id: int,
    team2_id: int,
    stadium_id: int | None = None,
    match_key: str | None = None,
) -> Match:
    match = Match(
        id=match_id,
        tournament_id=tournament_id,
        round="Matchday 1",
        group_name="Group A",
        match_date=match_date,
        match_time="13:00 UTC-6",
        team1_id=team1_id,
        team2_id=team2_id,
        stadium_id=stadium_id,
        match_key=match_key,
        score={"ft": [1, 0]},
    )
    return match


def test_dedupe_matches_keeps_stadium_linked_record(app):
    tournament = Tournament(name="World Cup 2026", year=2026, external_key="world-cup-2026")
    db.session.add(tournament)
    db.session.flush()

    duplicate = _seed_match(
        tournament.id,
        match_id=1070,
        match_date=date(2026, 6, 11),
        team1_id=1,
        team2_id=2,
        stadium_id=None,
    )
    preferred = _seed_match(
        tournament.id,
        match_id=1,
        match_date=date(2026, 6, 11),
        team1_id=1,
        team2_id=2,
        stadium_id=6,
        match_key="2026-06-11-mexico-vs-south-africa",
    )
    db.session.add_all([duplicate, preferred])
    db.session.commit()

    deduped = dedupe_matches([duplicate, preferred])

    assert len(deduped) == 1
    assert deduped[0].id == 1
    assert deduped[0].stadium_id == 6


def test_build_match_key_is_order_insensitive():
    from app.utils.match_key import build_match_key

    assert build_match_key("2026-06-11", "Mexico", "South Africa") == build_match_key(
        "2026-06-11", "South Africa", "Mexico"
    )

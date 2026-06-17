from datetime import date

from app.models.match import Match
from app.utils.match_dedup import dedupe_matches


def _seed_match(
    *,
    match_id: int,
    match_date: date,
    team1_id: int,
    team2_id: int,
    stadium_id: int | None = None,
    match_key: str | None = None,
) -> Match:
    return Match(
        id=match_id,
        tournament_id=1,
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


def test_dedupe_matches_keeps_stadium_linked_record():
    duplicate = _seed_match(
        match_id=1070,
        match_date=date(2026, 6, 11),
        team1_id=1,
        team2_id=2,
        stadium_id=None,
    )
    preferred = _seed_match(
        match_id=1,
        match_date=date(2026, 6, 11),
        team1_id=1,
        team2_id=2,
        stadium_id=6,
        match_key="2026-06-11-mexico-vs-south-africa",
    )

    deduped = dedupe_matches([duplicate, preferred])

    assert len(deduped) == 1
    assert deduped[0].id == 1
    assert deduped[0].stadium_id == 6


def test_dedupe_prefers_scored_row_over_unscored_stadium_row():
    unscored_stadium = Match(
        id=14,
        tournament_id=1,
        round="Matchday 3",
        group_name="Group C",
        match_date=date(2026, 6, 13),
        match_time="21:00 UTC-4",
        team1_id=1,
        team2_id=2,
        stadium_id=14,
        match_key=None,
        score=None,
    )
    scored_no_stadium = Match(
        id=1083,
        tournament_id=1,
        round="Matchday 3",
        group_name="Group C",
        match_date=date(2026, 6, 13),
        match_time="21:00 UTC-4",
        team1_id=1,
        team2_id=2,
        stadium_id=None,
        match_key="2026-06-13-haiti-vs-scotland",
        score={"ft": [0, 1], "ht": [0, 1]},
    )

    deduped = dedupe_matches([unscored_stadium, scored_no_stadium])

    assert len(deduped) == 1
    assert deduped[0].id == 1083
    assert deduped[0].score == {"ft": [0, 1], "ht": [0, 1]}


def test_build_match_key_is_order_insensitive():
    from app.utils.match_key import build_match_key

    assert build_match_key("2026-06-11", "Mexico", "South Africa") == build_match_key(
        "2026-06-11", "South Africa", "Mexico"
    )

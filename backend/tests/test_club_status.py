from app.ingestion.player_career_client import CareerStintDTO
from app.utils.club_status import (
    CLUB_STATUS_NONE,
    CLUB_STATUS_UNAVAILABLE,
    club_label,
    club_status_from_career,
)


def test_club_label_uses_club_name_when_present():
    assert club_label("Arsenal", None, wikidata_id="Q123") == "Arsenal"


def test_club_label_none_status():
    assert (
        club_label(None, CLUB_STATUS_NONE, wikidata_id="Q123") == "No current club"
    )


def test_club_label_unavailable_without_wikidata():
    assert club_label(None, None, wikidata_id=None) == "Unavailable"


def test_club_label_unavailable_with_wikidata():
    assert club_label(None, CLUB_STATUS_UNAVAILABLE, wikidata_id="Q123") == "Unavailable"


def test_club_status_from_career_current_club():
    club, status = club_status_from_career(
        [CareerStintDTO(team_name="Arsenal", is_current=True)]
    )
    assert club == "Arsenal"
    assert status is None


def test_club_status_from_career_no_current_club():
    club, status = club_status_from_career(
        [
            CareerStintDTO(
                team_name="Arsenal",
                start_date="2020-01-01",
                end_date="2022-06-30",
                is_current=False,
            )
        ]
    )
    assert club is None
    assert status == CLUB_STATUS_NONE


def test_club_status_from_career_empty_history():
    club, status = club_status_from_career([])
    assert club is None
    assert status == CLUB_STATUS_NONE

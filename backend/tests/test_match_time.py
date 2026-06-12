from datetime import date, datetime, timezone

from app.utils.match_time import parse_match_kickoff


def test_parse_match_kickoff_with_utc_offset():
    kickoff = parse_match_kickoff(date(2026, 6, 11), "19:00 UTC-4")
    assert kickoff == datetime(2026, 6, 11, 23, 0, tzinfo=timezone.utc)


def test_parse_match_kickoff_with_simple_time():
    kickoff = parse_match_kickoff(date(2026, 6, 11), "18:30")
    assert kickoff == datetime(2026, 6, 11, 18, 30, tzinfo=timezone.utc)


def test_parse_match_kickoff_without_time():
    kickoff = parse_match_kickoff(date(2026, 6, 11), None)
    assert kickoff == datetime(2026, 6, 11, 12, 0, tzinfo=timezone.utc)

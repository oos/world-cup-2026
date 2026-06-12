from app.ingestion.api_football_client import (
    club_from_statistics,
    normalize_api_position,
    world_cup_stat,
)


def test_normalize_api_position():
    assert normalize_api_position("Goalkeeper") == "GK"
    assert normalize_api_position("Defender") == "DEF"
    assert normalize_api_position("Midfielder") == "MID"
    assert normalize_api_position("Attacker") == "FWD"


def test_world_cup_stat_prefers_world_cup_league():
    stats = [
        {"league": {"id": 39}, "team": {"id": 33, "name": "Manchester United"}},
        {"league": {"id": 1}, "team": {"id": 26, "name": "Argentina"}, "games": {"number": 10}},
    ]
    stat = world_cup_stat(stats)
    assert stat is not None
    assert stat["team"]["name"] == "Argentina"


def test_club_from_statistics_skips_world_cup():
    stats = [
        {"league": {"id": 1}, "team": {"id": 26, "name": "Argentina"}},
        {"league": {"id": 39}, "team": {"id": 33, "name": "Inter Miami"}},
    ]
    assert club_from_statistics(stats) == "Inter Miami"

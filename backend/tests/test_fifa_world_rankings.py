from app.data.fifa_world_rankings_2026 import get_world_ranking_2026


def test_get_world_ranking_2026_for_world_cup_teams():
    assert get_world_ranking_2026("ARG") == 1
    assert get_world_ranking_2026("usa") == 17
    assert get_world_ranking_2026("CUW") == 82


def test_get_world_ranking_2026_non_world_cup_team():
    assert get_world_ranking_2026("ITA") == 12


def test_get_world_ranking_2026_unknown_team():
    assert get_world_ranking_2026("ZZZ") is None
    assert get_world_ranking_2026(None) is None

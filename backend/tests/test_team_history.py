import json

from app.services.history_service import HistoryService
from app.services.team_history_service import TeamHistoryService


def _sample_cache(tmp_path):
    cache_path = tmp_path / "history_cache.json"
    cache_path.write_text(
        json.dumps(
            {
                "synced_at": "2026-01-01T00:00:00",
                "tournaments": [
                    {"year": 2022, "name": "FIFA World Cup 2022", "match_count": 4},
                    {"year": 2018, "name": "FIFA World Cup 2018", "match_count": 2},
                ],
                "matches": [
                    {
                        "year": 2022,
                        "round": "Matchday 1",
                        "match_number": 1,
                        "date": "2022-11-22",
                        "time": "19:00",
                        "group": "Group C",
                        "team1": "Argentina",
                        "team2": "Saudi Arabia",
                        "stadium": "Lusail Stadium",
                        "score": {"ft": [1, 2]},
                    },
                    {
                        "year": 2022,
                        "round": "Semi-finals",
                        "match_number": 61,
                        "date": "2022-12-13",
                        "time": "20:00",
                        "group": None,
                        "team1": "Argentina",
                        "team2": "Croatia",
                        "stadium": "Lusail Stadium",
                        "score": {"ft": [3, 0]},
                    },
                    {
                        "year": 2022,
                        "round": "Final",
                        "match_number": 64,
                        "date": "2022-12-18",
                        "time": "18:00",
                        "group": None,
                        "team1": "Argentina",
                        "team2": "France",
                        "stadium": "Lusail Stadium",
                        "score": {"ft": [3, 3], "pens": [4, 2]},
                    },
                    {
                        "year": 2022,
                        "round": "Matchday 1",
                        "match_number": 2,
                        "date": "2022-11-22",
                        "time": "16:00",
                        "group": "Group D",
                        "team1": "France",
                        "team2": "Australia",
                        "stadium": "Al Janoub Stadium",
                        "score": {"ft": [4, 1]},
                    },
                    {
                        "year": 2018,
                        "round": "Final",
                        "match_number": 64,
                        "date": "2018-07-15",
                        "time": "18:00",
                        "group": None,
                        "team1": "France",
                        "team2": "Croatia",
                        "stadium": "Luzhniki Stadium",
                        "score": {"ft": [4, 2]},
                    },
                    {
                        "year": 2018,
                        "round": "Matchday 1",
                        "match_number": 1,
                        "date": "2018-06-14",
                        "time": "18:00",
                        "group": "Group A",
                        "team1": "Russia",
                        "team2": "Saudi Arabia",
                        "stadium": "Luzhniki Stadium",
                        "score": {"ft": [5, 0]},
                    },
                ],
            }
        )
    )
    return cache_path


def test_team_history_for_champion(tmp_path):
    cache_path = _sample_cache(tmp_path)
    service = TeamHistoryService(HistoryService(cache_path=cache_path))

    history = service.get_team_history("ARG", "Argentina")

    assert history["appearances"] == 1
    assert history["titles"] == 1
    assert history["title_years"] == [2022]
    assert history["best_finish"] == "Champions"
    assert history["best_finish_year"] == 2022
    assert history["total_matches"] == 3
    assert history["wins"] == 2
    assert history["losses"] == 1
    assert history["tournaments"][0]["finish"] == "Champions"


def test_team_history_for_multiple_appearances(tmp_path):
    cache_path = _sample_cache(tmp_path)
    service = TeamHistoryService(HistoryService(cache_path=cache_path))

    history = service.get_team_history("FRA", "France")

    assert history["appearances"] == 2
    assert history["titles"] == 1
    assert history["title_years"] == [2018]
    assert history["runners_up"] == 1
    assert history["best_finish"] == "Champions"
    assert history["world_cups_played"] == [2018, 2022]


def test_match_outcome_uses_penalties_and_extra_time():
    service = TeamHistoryService()

    pens_win = {
        "team1": "Argentina",
        "team2": "France",
        "score": {"ft": [2, 2], "et": [3, 3], "p": [4, 2]},
    }
    assert service._match_outcome(pens_win, 1) == "W"

    extra_time_win = {
        "team1": "Netherlands",
        "team2": "Argentina",
        "score": {"ft": [1, 1], "et": [1, 3]},
    }
    assert service._match_outcome(extra_time_win, 2) == "W"

    extra_time_loss = {
        "team1": "Argentina",
        "team2": "Germany",
        "score": {"ft": [0, 0], "et": [0, 1]},
    }
    assert service._match_outcome(extra_time_loss, 1) == "L"


def test_rounds_reached_counts_tournaments_not_matches(tmp_path):
    cache_path = tmp_path / "history_cache.json"
    cache_path.write_text(
        json.dumps(
            {
                "synced_at": "2026-01-01T00:00:00",
                "tournaments": [{"year": 1986, "name": "FIFA World Cup 1986", "match_count": 7}],
                "matches": [
                    {
                        "year": 1986,
                        "round": "Matchday 1",
                        "team1": "Argentina",
                        "team2": "South Korea",
                        "score": {"ft": [3, 1]},
                    },
                    {
                        "year": 1986,
                        "round": "Round of 16",
                        "team1": "Argentina",
                        "team2": "Uruguay",
                        "score": {"ft": [1, 0]},
                    },
                    {
                        "year": 1986,
                        "round": "Quarter-finals",
                        "team1": "Argentina",
                        "team2": "England",
                        "score": {"ft": [2, 1]},
                    },
                    {
                        "year": 1986,
                        "round": "Semi-finals",
                        "team1": "Argentina",
                        "team2": "Belgium",
                        "score": {"ft": [2, 0]},
                    },
                    {
                        "year": 1986,
                        "round": "Final",
                        "team1": "Argentina",
                        "team2": "West Germany",
                        "score": {"ft": [3, 2]},
                    },
                ],
            }
        )
    )
    service = TeamHistoryService(HistoryService(cache_path=cache_path))

    history = service.get_team_history("ARG", "Argentina")

    assert history["rounds_reached"]["Group Stage"] == 1
    assert history["rounds_reached"]["Round of 16"] == 1
    assert history["rounds_reached"]["Quarter-finals"] == 1
    assert history["rounds_reached"]["Semi-finals"] == 1
    assert history["rounds_reached"]["Final"] == 1
    assert history["rounds_reached"]["Third Place"] == 0
    assert history["round_matches"]["Round of 16"] == 1
    assert history["round_matches"]["Final"] == 1
    assert history["tournaments"][0]["round_matches"]["Round of 16"] == 1
    assert history["knockout_appearances"] == 1


def test_rounds_reached_uses_literal_round_play_not_inferred_stages(tmp_path):
    cache_path = tmp_path / "history_cache.json"
    cache_path.write_text(
        json.dumps(
            {
                "synced_at": "2026-01-01T00:00:00",
                "tournaments": [{"year": 1966, "name": "FIFA World Cup 1966", "match_count": 4}],
                "matches": [
                    {
                        "year": 1966,
                        "round": "Matchday 1",
                        "team1": "Argentina",
                        "team2": "West Germany",
                        "score": {"ft": [0, 0]},
                    },
                    {
                        "year": 1966,
                        "round": "Matchday 2",
                        "team1": "Argentina",
                        "team2": "Spain",
                        "score": {"ft": [2, 1]},
                    },
                    {
                        "year": 1966,
                        "round": "Matchday 3",
                        "team1": "Argentina",
                        "team2": "Switzerland",
                        "score": {"ft": [2, 0]},
                    },
                    {
                        "year": 1966,
                        "round": "Quarter-finals",
                        "team1": "England",
                        "team2": "Argentina",
                        "score": {"ft": [1, 0]},
                    },
                ],
            }
        )
    )
    service = TeamHistoryService(HistoryService(cache_path=cache_path))

    history = service.get_team_history("ARG", "Argentina")

    assert history["rounds_reached"]["Quarter-finals"] == 1
    assert history["rounds_reached"]["Round of 16"] == 0
    assert history["rounds_reached"]["Semi-finals"] == 0
    assert history["rounds_reached"]["Final"] == 0
    assert history["round_matches"]["Round of 16"] == 0
    assert history["knockout_appearances"] == 1


def test_team_history_empty_for_debutant(tmp_path):
    cache_path = _sample_cache(tmp_path)
    service = TeamHistoryService(HistoryService(cache_path=cache_path))

    history = service.get_team_history("UZB", "Uzbekistan")

    assert history["appearances"] == 0
    assert history["titles"] == 0
    assert history["best_finish"] is None

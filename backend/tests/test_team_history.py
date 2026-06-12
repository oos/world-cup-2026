from app.services.team_history_service import TeamHistoryService
from tests.history_fixtures import seed_history_matches

SAMPLE_MATCHES = [
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
]


def _seed_sample_history(app):
    seed_history_matches(SAMPLE_MATCHES)


def test_team_history_for_champion(app):
    _seed_sample_history(app)
    service = TeamHistoryService()

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


def test_team_history_for_multiple_appearances(app):
    _seed_sample_history(app)
    service = TeamHistoryService()

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


def test_rounds_reached_counts_tournaments_not_matches(app):
    seed_history_matches(
        [
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
        ]
    )
    service = TeamHistoryService()

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


def test_rounds_reached_uses_literal_round_play_not_inferred_stages(app):
    seed_history_matches(
        [
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
        ]
    )
    service = TeamHistoryService()

    history = service.get_team_history("ARG", "Argentina")

    assert history["rounds_reached"]["Quarter-finals"] == 1
    assert history["rounds_reached"]["Round of 16"] == 0
    assert history["rounds_reached"]["Semi-finals"] == 0
    assert history["rounds_reached"]["Final"] == 0
    assert history["round_matches"]["Round of 16"] == 0
    assert history["knockout_appearances"] == 1


def test_score_details_use_extra_time_score_not_full_time():
    service = TeamHistoryService()

    extra_time_and_pens = {
        "score": {"ft": [2, 2], "et": [3, 3], "p": [4, 2]},
    }
    details = service._score_details(extra_time_and_pens, 1)
    assert details["team_score"] == 3
    assert details["opponent_score"] == 3
    assert details["went_to_extra_time"] is True
    assert details["penalty_score"] == {"team": 4, "opponent": 2}
    assert service._format_score_display(details) == "3-3 AET (4-2 pens)"

    extra_time_only = {
        "score": {"ft": [0, 0], "et": [0, 1]},
    }
    details = service._score_details(extra_time_only, 1)
    assert details["team_score"] == 0
    assert details["opponent_score"] == 1
    assert details["went_to_extra_time"] is True
    assert service._format_score_display(details) == "0-1 AET"

    full_time_only = {
        "score": {"ft": [2, 0]},
    }
    details = service._score_details(full_time_only, 1)
    assert service._format_score_display(details) == "2-0"


def test_world_cup_results_include_all_years_and_match_details(app):
    seed_history_matches(
        [
            {
                "year": 2022,
                "round": "Final",
                "date": "2022-12-18",
                "team1": "Argentina",
                "team2": "France",
                "score": {"ft": [2, 2], "et": [3, 3], "p": [4, 2]},
                "goals1": [{"name": "Lionel Messi", "minute": 23}],
                "goals2": [{"name": "Kylian Mbappé", "minute": 80}],
            }
        ]
    )
    service = TeamHistoryService()

    history = service.get_team_history("ARG", "Argentina")

    assert len(history["world_cup_results"]) == 22
    assert history["world_cup_results"][0]["year"] == 2022
    assert history["world_cup_results"][0]["participated"] is True
    assert history["world_cup_results"][0]["finish"] == "Champions"
    assert history["world_cup_results"][0]["team_count"] == 32
    assert history["world_cup_results"][0]["group_count"] == 8
    match = history["world_cup_results"][0]["match_results"][0]
    assert match["opponent"] == "France"
    assert match["outcome"] == "W"
    assert match["team_score"] == 3
    assert match["opponent_score"] == 3
    assert match["went_to_extra_time"] is True
    assert match["penalty_score"] == {"team": 4, "opponent": 2}
    assert match["team_goals"][0]["name"] == "Lionel Messi"
    assert history["world_cup_results"][-1]["year"] == 1930
    assert history["world_cup_results"][-1]["participated"] is False
    assert history["world_cup_results"][-1]["team_count"] == 13
    assert history["world_cup_results"][-1]["group_count"] == 4
    assert history["world_cup_results"][-1]["absence_label"] == "Did not qualify"

    argentina_1954 = next(
        entry for entry in history["world_cup_results"] if entry["year"] == 1954
    )
    assert argentina_1954["participated"] is False
    assert argentina_1954["absence_reason"] == "withdrew"
    assert argentina_1954["absence_label"] == "Withdrew"
    assert "political" in (argentina_1954["absence_detail"] or "").lower()

    argentina_1970 = next(
        entry for entry in history["world_cup_results"] if entry["year"] == 1970
    )
    assert argentina_1970["absence_reason"] == "did_not_qualify"


def test_get_team_history_match_by_key(app):
    seed_history_matches(
        [
            {
                "year": 2022,
                "round": "Final",
                "date": "2022-12-18",
                "team1": "Argentina",
                "team2": "France",
                "score": {"ft": [2, 2], "et": [3, 3], "p": [4, 2]},
                "goals1": [{"name": "Lionel Messi", "minute": 23}],
                "goals2": [{"name": "Kylian Mbappé", "minute": 80}],
            }
        ]
    )
    service = TeamHistoryService()

    match = service.get_team_history_match("ARG", "Argentina", 2022, "2022-2022-12-18-france")

    assert match is not None
    assert match["match"]["opponent"] == "France"
    assert match["match"]["team_score"] == 3
    assert len(match["match"]["timeline"]) >= 3


def test_world_cup_results_include_current_world_cup_entry(app):
    seed_history_matches(
        [
            {
                "year": 2022,
                "round": "Final",
                "date": "2022-12-18",
                "team1": "Argentina",
                "team2": "France",
                "score": {"ft": [2, 2], "et": [3, 3], "p": [4, 2]},
            }
        ]
    )
    service = TeamHistoryService()

    history = service.get_team_history(
        "ARG",
        "Argentina",
        in_current_world_cup=True,
        current_group="A",
    )

    assert len(history["world_cup_results"]) == 23
    assert history["world_cup_results"][0]["year"] == 2026
    assert history["world_cup_results"][0]["status"] == "in_progress"
    assert history["world_cup_results"][0]["finish"] == "In Progress"
    assert history["world_cup_results"][0]["group"] == "A"
    assert history["world_cup_results"][0]["team_count"] == 48
    assert history["world_cup_results"][0]["group_count"] == 12
    assert history["world_cup_results"][1]["year"] == 2022


def test_current_world_cup_entry_includes_live_stats(app):
    seed_history_matches(
        [
            {
                "year": 2026,
                "round": "Matchday 1",
                "date": "2026-06-11",
                "team1": "Argentina",
                "team2": "Canada",
                "group": "Group J",
                "score": {"ft": [2, 1]},
            },
            {
                "year": 2026,
                "round": "Matchday 2",
                "date": "2026-06-18",
                "team1": "Argentina",
                "team2": "France",
                "group": "Group J",
            },
        ]
    )
    service = TeamHistoryService()

    history = service.get_team_history(
        "ARG",
        "Argentina",
        in_current_world_cup=True,
        current_group="Group J",
    )

    current = history["world_cup_results"][0]
    assert current["year"] == 2026
    assert current["status"] == "in_progress"
    assert current["wins"] == 1
    assert current["losses"] == 0
    assert current["goals_for"] == 2
    assert current["goals_against"] == 1
    assert len(current["match_results"]) == 1
    assert current["match_results"][0]["opponent"] == "Canada"


def test_team_history_empty_for_debutant(app):
    _seed_sample_history(app)
    service = TeamHistoryService()

    history = service.get_team_history(
        "UZB",
        "Uzbekistan",
        in_current_world_cup=True,
        current_group="B",
    )

    assert history["appearances"] == 0
    assert history["titles"] == 0
    assert history["best_finish"] is None
    assert len(history["world_cup_results"]) == 23
    assert history["world_cup_results"][0]["year"] == 2026
    assert history["world_cup_results"][0]["status"] == "in_progress"
    assert history["world_cup_results"][0]["group"] == "B"
    assert all(
        entry["participated"] is False
        for entry in history["world_cup_results"]
        if entry["year"] != 2026
    )
    assert history["world_cup_results"][1]["team_count"] == 32
    assert history["world_cup_results"][1]["group_count"] == 8

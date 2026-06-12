import json

from app.ingestion.goal_enrichment import (
    GoalEnrichmentService,
    enrich_match_goals,
    reset_goal_enrichment_service,
)
from app.ingestion.known_scores import apply_known_score


def _ronaldo_goal(date: str, minute: int, penalty: bool = False) -> dict:
    return {
        "match_name": "Portugal vs Iran",
        "match_date": date,
        "player_team_name": "Portugal",
        "team_name": "Portugal",
        "given_name": "Cristiano",
        "family_name": "Ronaldo",
        "minute_regulation": minute,
        "minute_stoppage": 0,
        "penalty": int(penalty),
        "own_goal": 0,
    }


def test_enrich_match_goals_adds_fjelstul_scorers(tmp_path):
    cache_path = tmp_path / "fjelstul_goals.json"
    cache_path.write_text(
        json.dumps(
            [
                _ronaldo_goal("2006-06-17", 63, penalty=True),
                {
                    "match_name": "Portugal vs Ghana",
                    "match_date": "2014-06-26",
                    "player_team_name": "Portugal",
                    "team_name": "Portugal",
                    "given_name": "Cristiano",
                    "family_name": "Ronaldo",
                    "minute_regulation": 80,
                    "minute_stoppage": 0,
                    "penalty": 0,
                    "own_goal": 0,
                },
            ]
        )
    )

    reset_goal_enrichment_service(cache_path)
    service = GoalEnrichmentService(cache_path=cache_path)
    goals = service.goals_for_match("2006-06-17", "Portugal", "Iran")
    assert goals is not None
    assert len(goals[0]) == 1
    assert goals[0][0]["name"] == "Cristiano Ronaldo"
    assert goals[0][0]["penalty"] is True

    match = enrich_match_goals(
        {
            "date": "2006-06-17",
            "team1": "Portugal",
            "team2": "Iran",
            "goals1": [],
            "goals2": [],
        }
    )
    assert match["goals1"][0]["name"] == "Cristiano Ronaldo"
    reset_goal_enrichment_service()


def test_player_name_ignores_not_applicable_given_name(tmp_path):
    cache_path = tmp_path / "fjelstul_goals.json"
    cache_path.write_text(
        json.dumps(
            [
                {
                    "match_name": "Brazil vs Bolivia",
                    "match_date": "1930-07-20",
                    "player_team_name": "Brazil",
                    "team_name": "Brazil",
                    "given_name": "not applicable",
                    "family_name": "Preguinho",
                    "minute_regulation": 37,
                    "minute_stoppage": 0,
                    "penalty": 0,
                    "own_goal": 0,
                },
                {
                    "match_name": "Portugal vs Brazil",
                    "match_date": "1966-07-26",
                    "player_team_name": "Portugal",
                    "team_name": "Portugal",
                    "given_name": "not applicable",
                    "family_name": "Eusébio",
                    "minute_regulation": 27,
                    "minute_stoppage": 0,
                    "penalty": 0,
                    "own_goal": 0,
                },
            ]
        )
    )

    reset_goal_enrichment_service(cache_path)
    brazil_goals = GoalEnrichmentService(cache_path=cache_path).goals_for_match(
        "1930-07-20", "Brazil", "Bolivia"
    )
    portugal_goals = GoalEnrichmentService(cache_path=cache_path).goals_for_match(
        "1966-07-26", "Portugal", "Brazil"
    )

    assert brazil_goals is not None
    assert brazil_goals[0][0]["name"] == "Preguinho"
    assert portugal_goals is not None
    assert portugal_goals[0][0]["name"] == "Eusébio"
    reset_goal_enrichment_service()


def test_known_scores_override_enriched_goals():
    match = apply_known_score(
        enrich_match_goals(
            {
                "date": "2026-06-11",
                "team1": "Mexico",
                "team2": "South Africa",
                "goals1": [{"name": "Wrong Player", "minute": 1}],
                "goals2": [{"name": "Other Player", "minute": 2}],
            }
        )
    )
    assert match["goals1"][0]["name"] == "Julián Quiñones"
    assert match["goals2"] == []

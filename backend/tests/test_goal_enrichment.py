from app.ingestion.goal_enrichment import GoalEnrichmentService, enrich_match_goals


def test_enrich_match_goals_adds_fjelstul_scorers():
    service = GoalEnrichmentService()
    service.prepare(
        [
            {
                "match_date": "2022-12-18",
                "match_name": "Argentina vs France",
                "player_team_name": "Argentina",
                "given_name": "Lionel",
                "family_name": "Messi",
                "minute_regulation": 23,
            },
            {
                "match_date": "2022-12-18",
                "match_name": "Argentina vs France",
                "player_team_name": "France",
                "given_name": "Kylian",
                "family_name": "Mbappé",
                "minute_regulation": 80,
            },
        ]
    )

    match = enrich_match_goals(
        {
            "date": "2022-12-18",
            "team1": "Argentina",
            "team2": "France",
        },
        goal_service=service,
    )

    assert match["goals1"][0]["name"] == "Lionel Messi"
    assert match["goals2"][0]["name"] == "Kylian Mbappé"


def test_goals_for_match_returns_none_when_unprepared():
    service = GoalEnrichmentService()
    assert service.goals_for_match("2022-12-18", "Argentina", "France") is None


def test_enrich_match_goals_noop_without_service():
    match = enrich_match_goals(
        {
            "date": "2022-12-18",
            "team1": "Argentina",
            "team2": "France",
        }
    )
    assert "goals1" not in match

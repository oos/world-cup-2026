from app.ingestion.espn_goals import parse_espn_summary_goals


def test_parse_espn_summary_goals():
    class Team:
        name = "Portugal"
        fifa_code = "POR"

    class Team2:
        name = "DR Congo"
        fifa_code = "COD"

    class Match:
        team1 = Team()
        team2 = Team2()

    summary = {
        "keyEvents": [
            {
                "scoringPlay": True,
                "type": {"text": "Goal - Header"},
                "team": {"displayName": "Portugal"},
                "participants": [{"athlete": {"displayName": "João Neves"}}],
                "clock": {"displayValue": "6'"},
            },
            {
                "scoringPlay": True,
                "type": {"text": "Goal - Header"},
                "team": {"displayName": "Congo DR"},
                "participants": [{"athlete": {"displayName": "Yoane Wissa"}}],
                "clock": {"displayValue": "45'+5'"},
            },
        ]
    }

    goals1, goals2 = parse_espn_summary_goals(summary, Match())
    assert goals1 == [{"name": "João Neves", "minute": 6}]
    assert goals2 == [{"name": "Yoane Wissa", "minute": 45, "offset": 5}]


def test_should_apply_during_live_when_score_unchanged():
    from app.ingestion.score_providers.base import ScoreUpdate
    from app.ingestion.score_providers.espn import EspnScoreProvider

    class Match:
        score = {
            "ft": [1, 1],
            "live": {"minute": 68, "display": "68'", "state": "in"},
        }

    update = ScoreUpdate(
        score={"ft": [1, 1], "live": {"minute": 71, "display": "71'", "state": "in"}},
        source="espn",
        status="in",
    )
    parsed = {"status_state": "in"}
    assert EspnScoreProvider.should_apply(Match(), update, parsed) is True

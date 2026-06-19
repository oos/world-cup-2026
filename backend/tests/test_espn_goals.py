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


def test_parse_espn_summary_goals_with_assist():
    class Team:
        name = "Mexico"
        fifa_code = "MEX"

    class Team2:
        name = "South Africa"
        fifa_code = "RSA"

    class Match:
        team1 = Team()
        team2 = Team2()

    summary = {
        "keyEvents": [
            {
                "scoringPlay": True,
                "type": {"text": "Goal"},
                "team": {"displayName": "Mexico"},
                "participants": [
                    {"athlete": {"displayName": "Julián Quiñones"}},
                    {"athlete": {"displayName": "Érik Lira"}},
                ],
                "clock": {"displayValue": "9'"},
            },
            {
                "scoringPlay": True,
                "type": {"text": "Goal - Header"},
                "team": {"displayName": "Mexico"},
                "participants": [
                    {"athlete": {"displayName": "Raúl Jiménez"}},
                    {"athlete": {"displayName": "Roberto Alvarado"}},
                ],
                "clock": {"displayValue": "67'"},
            },
        ]
    }

    goals1, goals2 = parse_espn_summary_goals(summary, Match())
    assert goals1 == [
        {"name": "Julián Quiñones", "minute": 9, "assist": "Érik Lira"},
        {"name": "Raúl Jiménez", "minute": 67, "assist": "Roberto Alvarado"},
    ]
    assert goals2 == []


def test_parse_espn_summary_penalty_goal():
    class Team:
        name = "England"
        fifa_code = "ENG"

    class Team2:
        name = "Croatia"
        fifa_code = "CRO"

    class Match:
        team1 = Team()
        team2 = Team2()

    summary = {
        "keyEvents": [
            {
                "scoringPlay": True,
                "type": {"text": "Penalty - Scored"},
                "team": {"displayName": "England"},
                "participants": [{"athlete": {"displayName": "Harry Kane"}}],
                "clock": {"displayValue": "12'"},
            },
            {
                "scoringPlay": True,
                "type": {"text": "Goal - Header"},
                "team": {"displayName": "England"},
                "participants": [{"athlete": {"displayName": "Harry Kane"}}],
                "clock": {"displayValue": "42'"},
            },
        ]
    }

    goals1, goals2 = parse_espn_summary_goals(summary, Match())
    assert goals1 == [
        {"name": "Harry Kane", "minute": 12, "penalty": True},
        {"name": "Harry Kane", "minute": 42},
    ]
    assert goals2 == []


def test_should_apply_after_full_time_when_score_unchanged():
    from app.ingestion.score_providers.base import ScoreUpdate
    from app.ingestion.score_providers.espn import EspnScoreProvider

    class Match:
        score = {
            "ft": [4, 2],
            "live": {"minute": 90, "display": "90'+7'", "state": "in", "period": "2H"},
        }

    update = ScoreUpdate(
        score={"ft": [4, 2], "final": True},
        source="espn",
        status="post",
    )
    parsed = {"status_state": "post", "status_completed": True}
    assert EspnScoreProvider.should_apply(Match(), update, parsed) is True


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

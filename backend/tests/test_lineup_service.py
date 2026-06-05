from app.services.lineup_service import LineupService


def test_predict_lineup_picks_eleven_players_in_formation():
    squad = {
        "GK": [{"id": 1, "name": "Keeper", "jersey_number": 1}],
        "DEF": [{"id": i, "name": f"Def {i}", "jersey_number": i} for i in range(2, 7)],
        "MID": [{"id": i, "name": f"Mid {i}", "jersey_number": i} for i in range(7, 11)],
        "FWD": [{"id": i, "name": f"Fwd {i}", "jersey_number": i} for i in range(11, 15)],
        "OTHER": [],
    }

    lineup = LineupService().predict(squad)

    assert lineup["formation"] == "4-3-3"
    assert len(lineup["players"]) == 11
    assert lineup["players"][0]["lineup_role"] == "GK"
    assert sum(1 for p in lineup["players"] if p["lineup_role"] == "DEF") == 4
    assert sum(1 for p in lineup["players"] if p["lineup_role"] == "MID") == 3
    assert sum(1 for p in lineup["players"] if p["lineup_role"] == "FWD") == 3


def test_predict_lineup_includes_remaining_squad_as_substitutes():
    squad = {
        "GK": [
            {"id": 1, "name": "Keeper 1", "jersey_number": 1},
            {"id": 2, "name": "Keeper 2", "jersey_number": 12},
        ],
        "DEF": [{"id": i, "name": f"Def {i}", "jersey_number": i} for i in range(3, 9)],
        "MID": [{"id": i, "name": f"Mid {i}", "jersey_number": i} for i in range(9, 14)],
        "FWD": [{"id": i, "name": f"Fwd {i}", "jersey_number": i} for i in range(14, 18)],
        "OTHER": [{"id": 99, "name": "Utility", "jersey_number": 99}],
    }

    lineup = LineupService().predict(squad)

    assert len(lineup["substitutes"]) == 7
    assert {player["id"] for player in lineup["substitutes"]} == {2, 7, 8, 12, 13, 17, 99}

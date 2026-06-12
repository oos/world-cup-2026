from app.utils.player_name import dedupe_players, normalize_player_name


class TestNormalizePlayerName:
    def test_strips_trailing_period(self):
        assert normalize_player_name("Aaron Wan-Bissaka.") == normalize_player_name(
            "Aaron Wan-Bissaka"
        )

    def test_normalizes_whitespace_and_case(self):
        assert normalize_player_name("  Lionel   Messi ") == "lionel messi"


class TestDedupePlayers:
    def test_keeps_more_complete_duplicate(self):
        players = [
            {
                "id": 1,
                "name": "Aaron Wan-Bissaka.",
                "team_name": "DR Congo",
                "club": None,
                "jersey_number": None,
            },
            {
                "id": 2,
                "name": "Aaron Wan-Bissaka",
                "team_name": "DR Congo",
                "club": "West Ham United",
                "jersey_number": 2,
            },
        ]

        deduped = dedupe_players(players)

        assert len(deduped) == 1
        assert deduped[0]["name"] == "Aaron Wan-Bissaka"
        assert deduped[0]["club"] == "West Ham United"

    def test_does_not_merge_same_name_on_different_teams(self):
        players = [
            {"id": 1, "name": "John Smith", "team_name": "USA"},
            {"id": 2, "name": "John Smith", "team_name": "Canada"},
        ]

        deduped = dedupe_players(players)

        assert len(deduped) == 2

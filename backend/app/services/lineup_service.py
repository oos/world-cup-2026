FORMATION = {
    "GK": 1,
    "DEF": 4,
    "MID": 3,
    "FWD": 3,
}


SQUAD_GROUPS = ("GK", "DEF", "MID", "FWD", "OTHER")


class LineupService:
    def predict(self, squad: dict) -> dict:
        players = []
        for role, count in FORMATION.items():
            for player in squad.get(role, [])[:count]:
                players.append({**player, "lineup_role": role})

        starter_ids = {player["id"] for player in players}
        substitutes = [
            player
            for group in SQUAD_GROUPS
            for player in squad.get(group, [])
            if player["id"] not in starter_ids
        ]

        return {
            "formation": "4-3-3",
            "players": players,
            "substitutes": substitutes,
        }

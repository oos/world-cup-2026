from __future__ import annotations

from app.ingestion.team_mapper import history_team_matches_fifa
from app.services.history_service import HistoryService

ROUND_CATEGORIES = [
    "Group Stage",
    "Round of 16",
    "Quarter-finals",
    "Semi-finals",
    "Third Place",
    "Final",
]

ROUND_RANK = {
    "Group Stage": 1,
    "Round of 16": 2,
    "Quarter-finals": 3,
    "Semi-finals": 4,
    "Third Place": 5,
    "Final": 6,
}

FINISH_RANK = {
    "Champions": 7,
    "Runners-up": 6,
    "Third place": 5,
    "Fourth place": 4,
    "Semi-finals": 4,
    "Quarter-finals": 3,
    "Round of 16": 2,
    "Group Stage": 1,
}


def normalize_round(round_name: str) -> str:
    value = (round_name or "").lower()

    if value in {"final", "final round"}:
        return "Final"
    if "third" in value or "3rd" in value or value == "match for third place":
        return "Third Place"
    if "semi" in value:
        return "Semi-finals"
    if "quarter" in value:
        return "Quarter-finals"
    if "round of 16" in value:
        return "Round of 16"
    if any(
        token in value
        for token in ("matchday", "first round", "preliminary", "play-off", "playoff")
    ):
        return "Group Stage"

    return "Group Stage"


class TeamHistoryService:
    def __init__(self, history_service: HistoryService | None = None) -> None:
        self.history_service = history_service or HistoryService()

    def get_team_history(self, fifa_code: str, team_name: str) -> dict:
        matches = [
            match
            for match in self.history_service.list_matches()
            if self._team_in_match(match, fifa_code, team_name)
        ]

        if not matches:
            return self._empty_history()

        by_year: dict[int, list[dict]] = {}
        for match in matches:
            by_year.setdefault(match["year"], []).append(match)

        total_wins = total_draws = total_losses = 0
        goals_for = goals_against = 0
        title_years: list[int] = []
        runners_up = 0
        tournaments: list[dict] = []

        for year in sorted(by_year):
            year_matches = by_year[year]
            year_stats = self._year_stats(year, year_matches, fifa_code, team_name)
            tournaments.append(year_stats)

            total_wins += year_stats["wins"]
            total_draws += year_stats["draws"]
            total_losses += year_stats["losses"]
            goals_for += year_stats["goals_for"]
            goals_against += year_stats["goals_against"]

            if year_stats["finish"] == "Champions":
                title_years.append(year)
            elif year_stats["finish"] == "Runners-up":
                runners_up += 1

        best_finish, best_finish_year = self._best_finish(tournaments)

        rounds_reached = self._aggregate_rounds_reached(tournaments)
        round_matches = self._aggregate_round_matches(tournaments)

        knockout_appearances = sum(
            1
            for entry in tournaments
            if ROUND_RANK[entry["best_round"]] > ROUND_RANK["Group Stage"]
        )

        return {
            "appearances": len(tournaments),
            "world_cups_played": [entry["year"] for entry in tournaments],
            "titles": len(title_years),
            "title_years": title_years,
            "runners_up": runners_up,
            "best_finish": best_finish,
            "best_finish_year": best_finish_year,
            "total_matches": len(matches),
            "wins": total_wins,
            "draws": total_draws,
            "losses": total_losses,
            "goals_for": goals_for,
            "goals_against": goals_against,
            "goal_difference": goals_for - goals_against,
            "knockout_appearances": knockout_appearances,
            "rounds_reached": rounds_reached,
            "round_matches": round_matches,
            "tournaments": tournaments,
        }

    def _empty_history(self) -> dict:
        return {
            "appearances": 0,
            "world_cups_played": [],
            "titles": 0,
            "title_years": [],
            "runners_up": 0,
            "best_finish": None,
            "best_finish_year": None,
            "total_matches": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "goals_for": 0,
            "goals_against": 0,
            "goal_difference": 0,
            "knockout_appearances": 0,
            "rounds_reached": {round_name: 0 for round_name in ROUND_CATEGORIES},
            "round_matches": {round_name: 0 for round_name in ROUND_CATEGORIES},
            "tournaments": [],
        }

    def _team_in_match(self, match: dict, fifa_code: str, team_name: str) -> bool:
        return any(
            history_team_matches_fifa(team, fifa_code, team_name)
            for team in (match.get("team1"), match.get("team2"))
            if team
        )

    def _team_side(self, match: dict, fifa_code: str, team_name: str) -> int | None:
        if history_team_matches_fifa(match.get("team1", ""), fifa_code, team_name):
            return 1
        if history_team_matches_fifa(match.get("team2", ""), fifa_code, team_name):
            return 2
        return None

    def _match_outcome(self, match: dict, side: int) -> str:
        score = match.get("score") or {}
        ft = score.get("ft") or [0, 0]
        pens = score.get("pens") or score.get("p")
        et = score.get("et")
        team_goals, opp_goals = (ft[0], ft[1]) if side == 1 else (ft[1], ft[0])

        if pens and len(pens) >= 2:
            team_pens, opp_pens = (pens[0], pens[1]) if side == 1 else (pens[1], pens[0])
            if team_pens > opp_pens:
                return "W"
            if team_pens < opp_pens:
                return "L"

        if et and len(et) >= 2:
            team_et, opp_et = (et[0], et[1]) if side == 1 else (et[1], et[0])
            if team_et > opp_et:
                return "W"
            if team_et < opp_et:
                return "L"

        if team_goals > opp_goals:
            return "W"
        if team_goals < opp_goals:
            return "L"
        return "D"

    def _year_stats(
        self,
        year: int,
        year_matches: list[dict],
        fifa_code: str,
        team_name: str,
    ) -> dict:
        rounds_played = {round_name: 0 for round_name in ROUND_CATEGORIES}
        wins = draws = losses = 0
        goals_for = goals_against = 0
        best_round = "Group Stage"
        final_match: dict | None = None
        third_place_match: dict | None = None

        for match in year_matches:
            side = self._team_side(match, fifa_code, team_name)
            if side is None:
                continue

            round_name = normalize_round(match.get("round", ""))
            rounds_played[round_name] += 1
            if ROUND_RANK[round_name] > ROUND_RANK[best_round]:
                best_round = round_name

            outcome = self._match_outcome(match, side)
            if outcome == "W":
                wins += 1
            elif outcome == "D":
                draws += 1
            else:
                losses += 1

            score = match.get("score") or {}
            ft = score.get("ft") or [0, 0]
            team_goals, opp_goals = (ft[0], ft[1]) if side == 1 else (ft[1], ft[0])
            goals_for += team_goals
            goals_against += opp_goals

            if round_name == "Final":
                final_match = match
            elif round_name == "Third Place":
                third_place_match = match

        finish = self._finish_label(best_round, final_match, third_place_match, fifa_code, team_name)

        return {
            "year": year,
            "finish": finish,
            "best_round": best_round,
            "matches": wins + draws + losses,
            "wins": wins,
            "draws": draws,
            "losses": losses,
            "goals_for": goals_for,
            "goals_against": goals_against,
            "round_matches": rounds_played,
        }

    def _aggregate_rounds_reached(self, tournaments: list[dict]) -> dict[str, int]:
        counts = {round_name: 0 for round_name in ROUND_CATEGORIES}
        for entry in tournaments:
            for round_name in ROUND_CATEGORIES:
                if entry["round_matches"].get(round_name, 0) > 0:
                    counts[round_name] += 1
        return counts

    def _aggregate_round_matches(self, tournaments: list[dict]) -> dict[str, int]:
        counts = {round_name: 0 for round_name in ROUND_CATEGORIES}
        for entry in tournaments:
            for round_name, count in entry["round_matches"].items():
                counts[round_name] += count
        return counts

    def _finish_label(
        self,
        best_round: str,
        final_match: dict | None,
        third_place_match: dict | None,
        fifa_code: str,
        team_name: str,
    ) -> str:
        if best_round == "Final" and final_match:
            side = self._team_side(final_match, fifa_code, team_name)
            if side is not None and self._match_outcome(final_match, side) == "W":
                return "Champions"
            return "Runners-up"

        if best_round == "Third Place" and third_place_match:
            side = self._team_side(third_place_match, fifa_code, team_name)
            if side is not None and self._match_outcome(third_place_match, side) == "W":
                return "Third place"
            return "Fourth place"

        return best_round

    def _best_finish(self, tournaments: list[dict]) -> tuple[str | None, int | None]:
        best: tuple[str | None, int | None] = (None, None)
        best_rank = -1

        for entry in tournaments:
            finish = entry["finish"]
            rank = FINISH_RANK.get(finish, ROUND_RANK.get(entry["best_round"], 0))
            if rank > best_rank:
                best_rank = rank
                best = (finish, entry["year"])

        return best

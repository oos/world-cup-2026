from __future__ import annotations

import re

from app.ingestion.non_participation import get_absence_reason
from app.ingestion.team_mapper import history_team_matches_fifa
from app.ingestion.world_cup_years import CURRENT_WORLD_CUP_YEAR, HISTORICAL_WORLD_CUP_YEARS
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

    def get_team_history(
        self,
        fifa_code: str,
        team_name: str,
        *,
        in_current_world_cup: bool = False,
        current_group: str | None = None,
    ) -> dict:
        matches = [
            match
            for match in self.history_service.list_matches()
            if self._team_in_match(match, fifa_code, team_name)
        ]

        by_year: dict[int, list[dict]] = {}
        if not matches:
            return self._empty_history(
                fifa_code,
                team_name,
                in_current_world_cup=in_current_world_cup,
                current_group=current_group,
            )

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
            "team_name": team_name,
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
            "world_cup_results": self._build_world_cup_results(
                fifa_code,
                tournaments,
                in_current_world_cup=in_current_world_cup,
                current_group=current_group,
            ),
        }

    def get_team_history_match(
        self,
        fifa_code: str,
        team_name: str,
        year: int,
        match_key: str,
    ) -> dict | None:
        for match in self.history_service.list_matches(year=year):
            if not self._team_in_match(match, fifa_code, team_name):
                continue

            side = self._team_side(match, fifa_code, team_name)
            if side is None:
                continue

            opponent = match.get("team2") if side == 1 else match.get("team1")
            if self._match_key(year, match.get("date"), opponent or "") != match_key:
                continue

            formatted = self._format_team_match(match, fifa_code, team_name)
            if not formatted:
                return None

            return {
                "team_name": team_name,
                "year": year,
                "match": formatted,
            }

        return None

    def _empty_history(
        self,
        fifa_code: str = "",
        team_name: str = "",
        *,
        in_current_world_cup: bool = False,
        current_group: str | None = None,
    ) -> dict:
        return {
            "team_name": team_name,
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
            "world_cup_results": self._build_world_cup_results(
                fifa_code,
                [],
                in_current_world_cup=in_current_world_cup,
                current_group=current_group,
            ),
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

    def _match_is_played(self, match: dict) -> bool:
        score = match.get("score")
        if not score:
            return False
        ft = score.get("ft")
        if not ft or len(ft) < 2:
            return False
        return ft[0] is not None and ft[1] is not None

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
            if not self._match_is_played(match):
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
        sorted_matches = sorted(
            year_matches,
            key=lambda match: (match.get("date") or "", match.get("match_number") or 0),
        )

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
            "match_results": [
                formatted
                for match in sorted_matches
                if self._match_is_played(match)
                and (formatted := self._format_team_match(match, fifa_code, team_name))
            ],
        }

    def _format_team_match(
        self,
        match: dict,
        fifa_code: str,
        team_name: str,
    ) -> dict:
        side = self._team_side(match, fifa_code, team_name)
        if side is None:
            return {}

        opponent = match.get("team2") if side == 1 else match.get("team1")
        team_goals_raw = match.get("goals1") if side == 1 else match.get("goals2")
        opponent_goals_raw = match.get("goals2") if side == 1 else match.get("goals1")

        score_details = self._score_details(match, side)
        year = match.get("year")
        match_key = self._match_key(year, match.get("date"), opponent or "")

        return {
            "match_key": match_key,
            "year": year,
            "round": match.get("round") or "",
            "group": match.get("group"),
            "date": match.get("date"),
            "time": match.get("time"),
            "stadium": match.get("stadium"),
            "opponent": opponent or "",
            "score": self._format_score_display(score_details),
            "team_score": score_details["team_score"],
            "opponent_score": score_details["opponent_score"],
            "went_to_extra_time": score_details["went_to_extra_time"],
            "penalty_score": score_details["penalty_score"],
            "full_time_score": score_details["full_time_score"],
            "half_time_score": score_details["half_time_score"],
            "extra_time_score": score_details["extra_time_score"],
            "outcome": self._match_outcome(match, side),
            "team_goals": self._format_goal_events(team_goals_raw),
            "opponent_goals": self._format_goal_events(opponent_goals_raw),
            "timeline": self._build_match_timeline(
                match,
                side,
                team_name,
                opponent or "",
                team_goals_raw,
                opponent_goals_raw,
            ),
        }

    def _match_key(self, year: int | None, date: str | None, opponent: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", opponent.lower()).strip("-") or "opponent"
        return f"{year}-{date or 'unknown'}-{slug}"

    def _score_pair(self, values: list | None, side: int) -> dict[str, int] | None:
        if not values or len(values) < 2:
            return None
        team_value, opponent_value = (values[0], values[1]) if side == 1 else (values[1], values[0])
        return {"team": team_value, "opponent": opponent_value}

    def _score_details(self, match: dict, side: int) -> dict:
        score = match.get("score") or {}
        ft = score.get("ft") or [0, 0]
        et = score.get("et")
        pens = score.get("pens") or score.get("p")
        full_time_score = self._score_pair(ft, side) or {"team": 0, "opponent": 0}

        if et and len(et) >= 2:
            team_score, opponent_score = (et[0], et[1]) if side == 1 else (et[1], et[0])
            went_to_extra_time = True
            extra_time_score = {"team": team_score, "opponent": opponent_score}
        else:
            team_score, opponent_score = full_time_score["team"], full_time_score["opponent"]
            went_to_extra_time = False
            extra_time_score = None

        penalty_score = None
        if pens and len(pens) >= 2:
            team_pens, opp_pens = (pens[0], pens[1]) if side == 1 else (pens[1], pens[0])
            penalty_score = {"team": team_pens, "opponent": opp_pens}

        return {
            "team_score": team_score,
            "opponent_score": opponent_score,
            "went_to_extra_time": went_to_extra_time,
            "penalty_score": penalty_score,
            "full_time_score": full_time_score,
            "half_time_score": self._score_pair(score.get("ht"), side),
            "extra_time_score": extra_time_score,
        }

    def _format_score_display(self, score_details: dict) -> str:
        parts = [
            f"{score_details['team_score']}-{score_details['opponent_score']}",
        ]
        if score_details["went_to_extra_time"]:
            parts.append("AET")
        penalty_score = score_details["penalty_score"]
        if penalty_score:
            parts.append(
                f"({penalty_score['team']}-{penalty_score['opponent']} pens)"
            )
        return " ".join(parts)

    def _build_match_timeline(
        self,
        match: dict,
        side: int,
        team_name: str,
        opponent: str,
        team_goals_raw: list | None,
        opponent_goals_raw: list | None,
    ) -> list[dict]:
        score = match.get("score") or {}
        events: list[dict] = [
            {"type": "kickoff", "minute": 0, "label": "Kick-off"},
        ]

        def append_goal(goal: dict, for_team: bool) -> None:
            minute = goal.get("minute")
            name = goal.get("name") or "Unknown"
            tags: list[str] = []
            if goal.get("penalty"):
                tags.append("pen")
            if goal.get("owngoal"):
                tags.append("OG")
            label = f"{name} ({minute}')" if minute is not None else name
            if tags:
                label = f"{label} [{', '.join(tags)}]"
            events.append(
                {
                    "type": "goal",
                    "minute": minute if minute is not None else 0,
                    "side": "team" if for_team else "opponent",
                    "team_name": team_name if for_team else opponent,
                    "scorer": name,
                    "label": label,
                    "penalty": bool(goal.get("penalty")),
                    "own_goal": bool(goal.get("owngoal")),
                }
            )

        for goal in team_goals_raw or []:
            append_goal(goal, True)
        for goal in opponent_goals_raw or []:
            append_goal(goal, False)

        half_time_score = self._score_pair(score.get("ht"), side)
        if half_time_score:
            events.append(
                {
                    "type": "half_time",
                    "minute": 45,
                    "label": "Half time",
                    "team_score": half_time_score["team"],
                    "opponent_score": half_time_score["opponent"],
                }
            )

        full_time_score = self._score_pair(score.get("ft"), side) or {"team": 0, "opponent": 0}
        events.append(
            {
                "type": "full_time",
                "minute": 90,
                "label": "Full time",
                "team_score": full_time_score["team"],
                "opponent_score": full_time_score["opponent"],
            }
        )

        extra_time_score = self._score_pair(score.get("et"), side)
        if extra_time_score:
            events.append(
                {
                    "type": "extra_time_end",
                    "minute": 120,
                    "label": "End of extra time",
                    "team_score": extra_time_score["team"],
                    "opponent_score": extra_time_score["opponent"],
                }
            )

        pens = score.get("pens") or score.get("p")
        penalty_score = self._score_pair(pens, side)
        if penalty_score:
            events.append(
                {
                    "type": "penalties",
                    "minute": 120,
                    "label": "Penalty shoot-out",
                    "team_score": penalty_score["team"],
                    "opponent_score": penalty_score["opponent"],
                }
            )

        type_order = {
            "kickoff": 0,
            "goal": 1,
            "half_time": 2,
            "full_time": 3,
            "extra_time_end": 4,
            "penalties": 5,
        }
        events.sort(key=lambda event: (event.get("minute", 0), type_order.get(event["type"], 9)))
        return events

    def _format_goal_events(self, goals: list | None) -> list[dict]:
        if not goals:
            return []

        events = []
        for goal in goals:
            name = goal.get("name") or "Unknown"
            minute = goal.get("minute")
            tags: list[str] = []
            if goal.get("penalty"):
                tags.append("pen")
            if goal.get("owngoal"):
                tags.append("OG")

            label = f"{name} ({minute}')" if minute is not None else name
            if tags:
                label = f"{label} [{', '.join(tags)}]"

            events.append(
                {
                    "name": name,
                    "minute": minute,
                    "label": label,
                }
            )
        return events

    def _tournament_format_fields(self, year: int) -> dict[str, int]:
        return self.history_service.get_tournament_format(year)

    def _absence_fields(self, fifa_code: str, year: int) -> dict[str, str | None]:
        return get_absence_reason(fifa_code, year)

    def _build_current_world_cup_entry(
        self,
        group_name: str | None,
        tournament_entry: dict | None = None,
    ) -> dict:
        format_fields = self._tournament_format_fields(CURRENT_WORLD_CUP_YEAR)
        entry = {
            "year": CURRENT_WORLD_CUP_YEAR,
            "participated": True,
            "status": "in_progress",
            "finish": "In Progress",
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "goals_for": 0,
            "goals_against": 0,
            "match_results": [],
            **format_fields,
        }
        if group_name:
            entry["group"] = group_name
        if tournament_entry:
            entry.update(
                {
                    "wins": tournament_entry["wins"],
                    "draws": tournament_entry["draws"],
                    "losses": tournament_entry["losses"],
                    "goals_for": tournament_entry["goals_for"],
                    "goals_against": tournament_entry["goals_against"],
                    "match_results": tournament_entry.get("match_results", []),
                }
            )
        return entry

    def _build_world_cup_results(
        self,
        fifa_code: str,
        tournaments: list[dict],
        *,
        in_current_world_cup: bool = False,
        current_group: str | None = None,
    ) -> list[dict]:
        tournament_by_year = {entry["year"]: entry for entry in tournaments}
        results = []

        if in_current_world_cup:
            results.append(
                self._build_current_world_cup_entry(
                    current_group,
                    tournament_by_year.get(CURRENT_WORLD_CUP_YEAR),
                )
            )

        for year in reversed(HISTORICAL_WORLD_CUP_YEARS):
            format_fields = self._tournament_format_fields(year)
            entry = tournament_by_year.get(year)
            if entry:
                results.append(
                    {
                        "year": year,
                        "participated": True,
                        "finish": entry["finish"],
                        "wins": entry["wins"],
                        "draws": entry["draws"],
                        "losses": entry["losses"],
                        "goals_for": entry["goals_for"],
                        "goals_against": entry["goals_against"],
                        "match_results": entry["match_results"],
                        **format_fields,
                    }
                )
            else:
                results.append(
                    {
                        "year": year,
                        "participated": False,
                        **format_fields,
                        **self._absence_fields(fifa_code, year),
                    }
                )

        return results

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

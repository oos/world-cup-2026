"""Assemble a knockout bracket from matches, aggregating two-legged ties."""

from __future__ import annotations

from app.extensions import db
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam

STAGE_ORDER = {
    "knockout_playoff": 5,
    "round_of_32": 10,
    "round_of_16": 20,
    "quarter_final": 30,
    "third_place": 45,
    "semi_final": 40,
    "final": 50,
}

STAGE_LABELS = {
    "knockout_playoff": "Knockout play-offs",
    "round_of_32": "Round of 32",
    "round_of_16": "Round of 16",
    "quarter_final": "Quarter-finals",
    "semi_final": "Semi-finals",
    "third_place": "Third place",
    "final": "Final",
}

NON_KNOCKOUT_STAGES = {"group", "league", "league_phase"}


def _stage_from_round(round_name: str | None) -> str | None:
    if not round_name:
        return None
    text = round_name.strip().lower()
    if text.startswith("matchday"):
        return None
    if "play-off" in text and "third" not in text:
        return "knockout_playoff"
    if "round of 32" in text or "last 32" in text:
        return "round_of_32"
    if "round of 16" in text or "last 16" in text:
        return "round_of_16"
    if "quarter" in text:
        return "quarter_final"
    if "semi" in text:
        return "semi_final"
    if "third" in text:
        return "third_place"
    if "final" in text:
        return "final"
    return None


class BracketService:
    def get_bracket(self, slug: str) -> dict | None:
        tournament = db.session.scalars(
            db.select(Tournament).where(Tournament.external_key == slug)
        ).first()
        if not tournament:
            return None

        layout = tournament.layout_config or {}
        bracket_cfg = (layout.get("bracket") or {}) if isinstance(layout, dict) else {}

        teams = {
            t.id: t
            for t in db.session.scalars(
                db.select(TournamentTeam).where(TournamentTeam.tournament_id == tournament.id)
            ).all()
        }
        matches = db.session.scalars(
            db.select(Match).where(Match.tournament_id == tournament.id)
        ).all()

        # group ties by (stage, team-pair)
        ties: dict[tuple, dict] = {}
        for match in matches:
            stage = match.stage if match.stage and match.stage not in NON_KNOCKOUT_STAGES else None
            if stage is None:
                stage = _stage_from_round(match.round)
            if stage is None or stage in NON_KNOCKOUT_STAGES:
                continue
            if not match.team1_id or not match.team2_id:
                continue
            pair = frozenset((match.team1_id, match.team2_id))
            key = (stage, pair)
            tie = ties.setdefault(
                key,
                {
                    "stage": stage,
                    "team_a": match.team1_id,
                    "team_b": match.team2_id,
                    "score_a": 0,
                    "score_b": 0,
                    "legs": [],
                    "has_score": False,
                },
            )
            ft = match.score.get("ft") if isinstance(match.score, dict) else None
            leg = {"leg": match.leg, "team1": match.team1_id, "team2": match.team2_id, "ft": ft}
            tie["legs"].append(leg)
            if ft and len(ft) >= 2:
                tie["has_score"] = True
                # accumulate relative to canonical team_a/team_b orientation
                if match.team1_id == tie["team_a"]:
                    tie["score_a"] += int(ft[0])
                    tie["score_b"] += int(ft[1])
                else:
                    tie["score_a"] += int(ft[1])
                    tie["score_b"] += int(ft[0])

        rounds: dict[str, list[dict]] = {}
        for tie in ties.values():
            rounds.setdefault(tie["stage"], []).append(self._serialize_tie(tie, teams))

        ordered = sorted(rounds.items(), key=lambda kv: STAGE_ORDER.get(kv[0], 99))
        payload_rounds = [
            {"key": stage, "label": STAGE_LABELS.get(stage, stage), "ties": tie_list}
            for stage, tie_list in ordered
        ]
        return {"two_legged": bool(bracket_cfg.get("two_legged")), "rounds": payload_rounds}

    @staticmethod
    def _team_dict(team: TournamentTeam | None) -> dict | None:
        if team is None:
            return None
        return {
            "id": team.id,
            "name": team.name,
            "fifa_code": team.fifa_code,
            "flag_iso": team.flag_iso,
            "crest_url": team.crest_url,
        }

    def _serialize_tie(self, tie: dict, teams: dict[int, TournamentTeam]) -> dict:
        winner = None
        if tie["has_score"]:
            if tie["score_a"] > tie["score_b"]:
                winner = tie["team_a"]
            elif tie["score_b"] > tie["score_a"]:
                winner = tie["team_b"]
        return {
            "team1": self._team_dict(teams.get(tie["team_a"])),
            "team2": self._team_dict(teams.get(tie["team_b"])),
            "score1": tie["score_a"] if tie["has_score"] else None,
            "score2": tie["score_b"] if tie["has_score"] else None,
            "legs": [
                {
                    "leg": leg["leg"],
                    "ft": leg["ft"],
                    "home": teams.get(leg["team1"]).name if teams.get(leg["team1"]) else None,
                    "away": teams.get(leg["team2"]).name if teams.get(leg["team2"]) else None,
                }
                for leg in sorted(tie["legs"], key=lambda x: (x["leg"] or 0))
            ],
            "winner_team_id": winner,
        }

"""Compute standings from matches, format-aware (single / groups / league-phase)."""

from __future__ import annotations

from app.extensions import db
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam


def _empty_row(team: TournamentTeam) -> dict:
    return {
        "team_id": team.id,
        "name": team.name,
        "fifa_code": team.fifa_code,
        "flag_iso": team.flag_iso,
        "crest_url": team.crest_url,
        "group": team.group_name,
        "played": 0,
        "won": 0,
        "drawn": 0,
        "lost": 0,
        "goals_for": 0,
        "goals_against": 0,
        "goal_difference": 0,
        "points": 0,
    }


def _final_score(match: Match) -> tuple[int, int] | None:
    score = match.score
    if not isinstance(score, dict):
        return None
    ft = score.get("ft")
    if not ft or len(ft) < 2:
        return None
    try:
        return int(ft[0]), int(ft[1])
    except (TypeError, ValueError):
        return None


def _counts_for_mode(match: Match, mode: str) -> bool:
    if mode == "groups":
        if not match.group_name:
            return False
        if match.stage and match.stage not in ("group",):
            return False
        round_name = (match.round or "").lower()
        return match.stage == "group" or round_name.startswith("matchday") or not match.stage
    if mode == "league_phase":
        return match.stage == "league_phase"
    # single (pure league)
    return match.stage in (None, "league")


class StandingsService:
    def get_standings(self, slug: str) -> dict | None:
        tournament = db.session.scalars(
            db.select(Tournament).where(Tournament.external_key == slug)
        ).first()
        if not tournament:
            return None

        layout = tournament.layout_config or {}
        standings_cfg = (layout.get("standings") or {}) if isinstance(layout, dict) else {}
        mode = standings_cfg.get("mode") or "single"
        zones = standings_cfg.get("zones") or []

        teams = db.session.scalars(
            db.select(TournamentTeam).where(TournamentTeam.tournament_id == tournament.id)
        ).all()
        rows_by_team = {team.id: _empty_row(team) for team in teams}

        matches = db.session.scalars(
            db.select(Match).where(Match.tournament_id == tournament.id)
        ).all()

        for match in matches:
            if not _counts_for_mode(match, mode):
                continue
            score = _final_score(match)
            if score is None or not match.team1_id or not match.team2_id:
                continue
            g1, g2 = score
            self._apply(rows_by_team.get(match.team1_id), g1, g2)
            self._apply(rows_by_team.get(match.team2_id), g2, g1)

        if mode == "groups":
            groups: dict[str, list[dict]] = {}
            for row in rows_by_team.values():
                groups.setdefault(row["group"] or "", []).append(row)
            group_payload = []
            for name in sorted(g for g in groups if g):
                ranked = self._rank(groups[name], zones)
                group_payload.append({"name": name, "rows": ranked})
            return {"mode": mode, "zones": zones, "groups": group_payload}

        ranked = self._rank(list(rows_by_team.values()), zones)
        return {"mode": mode, "zones": zones, "rows": ranked}

    @staticmethod
    def _apply(row: dict | None, gf: int, ga: int) -> None:
        if row is None:
            return
        row["played"] += 1
        row["goals_for"] += gf
        row["goals_against"] += ga
        row["goal_difference"] = row["goals_for"] - row["goals_against"]
        if gf > ga:
            row["won"] += 1
            row["points"] += 3
        elif gf == ga:
            row["drawn"] += 1
            row["points"] += 1
        else:
            row["lost"] += 1

    @staticmethod
    def _rank(rows: list[dict], zones: list[dict]) -> list[dict]:
        rows.sort(
            key=lambda r: (-r["points"], -r["goal_difference"], -r["goals_for"], r["name"])
        )
        for index, row in enumerate(rows, start=1):
            row["position"] = index
            row["zone"] = None
            for zone in zones:
                if zone.get("from", 0) <= index <= zone.get("to", 0):
                    row["zone"] = {"kind": zone.get("kind"), "label": zone.get("label")}
                    break
        return rows

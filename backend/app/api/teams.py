from flask import Blueprint, jsonify, request

from app.data.fifa_world_rankings_2026 import RANKINGS_AS_OF, list_world_rankings_2026
from app.services.squad_service import SquadService
from app.services.team_history_service import TeamHistoryService

teams_bp = Blueprint("teams", __name__)
squad_service = SquadService()
team_history_service = TeamHistoryService()


@teams_bp.route("")
def list_teams():
    group = request.args.get("group")
    competition = request.args.get("competition")
    return jsonify({"teams": squad_service.list_teams(group=group, competition_slug=competition)})


@teams_bp.route("/stats")
def stats():
    return jsonify(squad_service.get_stats())


@teams_bp.route("/world-rankings")
def world_rankings():
    wc_teams_by_code = {
        team["fifa_code"]: team for team in squad_service.list_teams()
    }
    rankings = []
    for entry in list_world_rankings_2026():
        wc_team = wc_teams_by_code.get(entry["fifa_code"])
        rankings.append(
            {
                **entry,
                "qualified": wc_team is not None,
                "team_id": wc_team["id"] if wc_team else None,
                "group": wc_team["group"] if wc_team else None,
                "player_count": wc_team["player_count"] if wc_team else None,
            }
        )
    return jsonify({"as_of": RANKINGS_AS_OF, "rankings": rankings})


@teams_bp.route("/<int:team_id>")
def get_team(team_id: int):
    team = squad_service.get_team(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404
    return jsonify(team)


@teams_bp.route("/<int:team_id>/squad")
def get_squad(team_id: int):
    squad = squad_service.get_squad(team_id)
    return jsonify({"squad": squad})


@teams_bp.route("/<int:team_id>/history")
def get_team_history(team_id: int):
    team = squad_service.get_team(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404
    history = team_history_service.get_team_history(
        team["fifa_code"],
        team["name"],
        in_current_world_cup=True,
        current_group=team.get("group"),
    )
    return jsonify(history)


@teams_bp.route("/<int:team_id>/history/<int:year>/matches/<match_key>")
def get_team_history_match(team_id: int, year: int, match_key: str):
    team = squad_service.get_team(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404
    match = team_history_service.get_team_history_match(
        team["fifa_code"],
        team["name"],
        year,
        match_key,
    )
    if not match:
        return jsonify({"error": "Match not found"}), 404
    return jsonify(match)

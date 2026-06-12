from flask import Blueprint, jsonify, request

from app.services.squad_service import SquadService
from app.services.team_history_service import TeamHistoryService

teams_bp = Blueprint("teams", __name__)
squad_service = SquadService()
team_history_service = TeamHistoryService()


@teams_bp.route("")
def list_teams():
    group = request.args.get("group")
    return jsonify({"teams": squad_service.list_teams(group=group)})


@teams_bp.route("/stats")
def stats():
    return jsonify(squad_service.get_stats())


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
    history = team_history_service.get_team_history(team["fifa_code"], team["name"])
    return jsonify(history)

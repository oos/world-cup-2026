from flask import Blueprint, jsonify, request

from app.services.squad_service import SquadService

teams_bp = Blueprint("teams", __name__)
squad_service = SquadService()


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

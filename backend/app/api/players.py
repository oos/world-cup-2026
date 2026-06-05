from flask import Blueprint, jsonify, request

from app.services.squad_service import CURRENT_TOURNAMENT_YEAR, SquadService

players_bp = Blueprint("players", __name__)
squad_service = SquadService()


@players_bp.route("")
def list_players():
    year = request.args.get("year", type=int, default=CURRENT_TOURNAMENT_YEAR)
    group = request.args.get("group")
    position = request.args.get("position")
    team_id = request.args.get("team_id", type=int)
    players = squad_service.list_players(
        year=year,
        group=group,
        position=position,
        team_id=team_id,
    )
    return jsonify({"players": players, "year": year})


@players_bp.route("/<int:player_id>")
def get_player(player_id: int):
    player = squad_service.get_player(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404
    return jsonify(player)

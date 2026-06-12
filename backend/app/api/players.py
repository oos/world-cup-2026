from flask import Blueprint, jsonify, request

from app.services.player_career_service import PlayerCareerService
from app.services.player_honours_service import PlayerHonoursService
from app.services.squad_service import CURRENT_TOURNAMENT_YEAR, SquadService

players_bp = Blueprint("players", __name__)
squad_service = SquadService()
career_service = PlayerCareerService()
honours_service = PlayerHonoursService()


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


@players_bp.route("/<int:player_id>/career")
def get_player_career(player_id: int):
    career = career_service.get_career(player_id)
    if career is None:
        return jsonify({"error": "Player not found"}), 404
    return jsonify(career)


@players_bp.route("/<int:player_id>/honours")
def get_player_honours(player_id: int):
    refresh = request.args.get("refresh", "").lower() in {"1", "true", "yes"}
    honours = honours_service.get_honours(player_id, refresh=refresh)
    if honours is None:
        return jsonify({"error": "Player not found"}), 404
    return jsonify(honours)

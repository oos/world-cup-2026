from flask import Blueprint, jsonify, request

from app.services.history_service import HistoryService

history_bp = Blueprint("history", __name__)
history_service = HistoryService()


@history_bp.route("/tournaments")
def list_tournaments():
    return jsonify({"tournaments": history_service.list_tournaments()})


@history_bp.route("/matches")
def list_matches():
    year = request.args.get("year", type=int)
    round_name = request.args.get("round")
    group = request.args.get("group")
    matches = history_service.list_matches(year=year, round_name=round_name, group=group)
    return jsonify({"matches": matches})


@history_bp.route("/matches/<int:year>/<path:match_key>")
def get_match(year: int, match_key: str):
    match = history_service.get_match_detail(year, match_key)
    if match is None:
        return jsonify({"error": "Match not found"}), 404
    return jsonify(match)


@history_bp.route("/matches/<int:year>/<path:match_key>/commentary")
def get_match_commentary(year: int, match_key: str):
    from app.services.espn_commentary_service import EspnCommentaryService

    payload = EspnCommentaryService.get_stored_commentary_for_history(year, match_key)
    if payload is None:
        return jsonify({"error": "Commentary not found"}), 404
    return jsonify(payload)


@history_bp.route("/teams")
def list_teams():
    year = request.args.get("year", type=int)
    if year is None:
        return jsonify({"error": "year is required"}), 400
    return jsonify({"teams": history_service.list_teams(year)})

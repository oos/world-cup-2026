from flask import Blueprint, jsonify, request

from app.services.match_service import MatchService

matches_bp = Blueprint("matches", __name__)
match_service = MatchService()


@matches_bp.route("")
def list_matches():
    group = request.args.get("group")
    competition = request.args.get("competition")
    return jsonify(
        {"matches": match_service.list_matches(group=group, competition_slug=competition)}
    )


@matches_bp.route("/<int:match_id>")
def get_match(match_id: int):
    match = match_service.get_match(match_id)
    if not match:
        return jsonify({"error": "Match not found"}), 404
    return jsonify(match)


@matches_bp.route("/<int:match_id>/commentary")
def get_match_commentary(match_id: int):
    from app.services.espn_commentary_service import EspnCommentaryService

    payload = EspnCommentaryService.get_stored_commentary_for_match_id(match_id)
    if payload is None:
        return jsonify({"error": "Commentary not found"}), 404
    return jsonify(payload)

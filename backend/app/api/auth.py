"""Auth API endpoints."""

from flask import Blueprint, jsonify, request

from app.services.auth_service import AuthService, SESSION_COOKIE_NAME
from app.services.saved_items_service import SavedItemsService

auth_bp = Blueprint("auth", __name__)
auth_service = AuthService()
saved_items_service = SavedItemsService()


def _current_user():
    return auth_service.get_user_from_cookie(request.cookies.get(SESSION_COOKIE_NAME))


@auth_bp.route("/magic-link", methods=["POST"])
def request_magic_link():
    payload = request.get_json(silent=True) or {}
    email = payload.get("email")
    if not email:
        return jsonify({"error": "email is required"}), 400

    try:
        auth_service.create_magic_link(str(email))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"sent": True})


@auth_bp.route("/verify", methods=["POST"])
def verify_magic_link():
    payload = request.get_json(silent=True) or {}
    token = payload.get("token")
    if not token:
        return jsonify({"error": "token is required"}), 400

    try:
        user = auth_service.verify_magic_link(str(token))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    response = jsonify({"user": user.to_dict()})
    auth_service.issue_session_cookie(response, user)
    return response


@auth_bp.route("/me", methods=["GET"])
def get_me():
    user = _current_user()
    if user is None:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify({"user": user.to_dict()})


@auth_bp.route("/me", methods=["PATCH"])
def update_me():
    user = _current_user()
    if user is None:
        return jsonify({"error": "Not authenticated"}), 401

    payload = request.get_json(silent=True) or {}
    user = auth_service.update_profile(user, payload)
    return jsonify({"user": user.to_dict()})


@auth_bp.route("/oauth/<provider>", methods=["POST"])
def start_oauth(provider: str):
    supported = {"google", "apple", "github"}
    if provider not in supported:
        return jsonify({"error": "Unsupported provider"}), 400

    try:
        url = auth_service.get_oauth_start_url(provider)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 503

    return jsonify({"url": url})


@auth_bp.route("/logout", methods=["POST"])
def logout():
    response = jsonify({"logged_out": True})
    auth_service.clear_session_cookie(response)
    return response


@auth_bp.route("/saved", methods=["GET"])
def list_saved_items():
    user = _current_user()
    if user is None:
        return jsonify({"error": "Not authenticated"}), 401

    items = saved_items_service.list_items(user)
    return jsonify({"items": items})


@auth_bp.route("/saved", methods=["POST"])
def add_saved_item():
    user = _current_user()
    if user is None:
        return jsonify({"error": "Not authenticated"}), 401

    payload = request.get_json(silent=True) or {}
    item_type = payload.get("item_type")
    item_id = payload.get("item_id")
    if not item_type or item_id is None:
        return jsonify({"error": "item_type and item_id are required"}), 400

    try:
        item = saved_items_service.add_item(user, str(item_type), int(item_id))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"item": item}), 201


@auth_bp.route("/saved/<item_type>/<int:item_id>", methods=["DELETE"])
def remove_saved_item(item_type: str, item_id: int):
    user = _current_user()
    if user is None:
        return jsonify({"error": "Not authenticated"}), 401

    try:
        removed = saved_items_service.remove_item(user, item_type, item_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not removed:
        return jsonify({"error": "Saved item not found"}), 404

    return "", 204

"""Auth API endpoints."""

from flask import Blueprint, jsonify, request

from app.services.auth_service import AuthService, SESSION_COOKIE_NAME

auth_bp = Blueprint("auth", __name__)
auth_service = AuthService()


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

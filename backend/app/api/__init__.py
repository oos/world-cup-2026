from flask import Blueprint, jsonify

api_bp = Blueprint("api", __name__)


@api_bp.route("/health")
def health():
    return jsonify({"status": "ok"})


def register_blueprints(app) -> None:
    from app.api.history import history_bp
    from app.api.matches import matches_bp
    from app.api.players import players_bp
    from app.api.teams import teams_bp

    app.register_blueprint(api_bp, url_prefix="/api/v1")
    app.register_blueprint(teams_bp, url_prefix="/api/v1/teams")
    app.register_blueprint(players_bp, url_prefix="/api/v1/players")
    app.register_blueprint(matches_bp, url_prefix="/api/v1/matches")
    app.register_blueprint(history_bp, url_prefix="/api/v1/history")

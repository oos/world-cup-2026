from flask import Blueprint, jsonify

from app.data.broadcast_rights_2026 import get_broadcast_country, list_broadcast_countries

broadcast_bp = Blueprint("broadcast", __name__)


@broadcast_bp.route("/countries")
def list_countries():
    return jsonify({"countries": list_broadcast_countries()})


@broadcast_bp.route("/countries/<country_code>")
def get_country(country_code: str):
    country = get_broadcast_country(country_code)
    if not country:
        return jsonify({"error": "Country not found"}), 404
    return jsonify(country)

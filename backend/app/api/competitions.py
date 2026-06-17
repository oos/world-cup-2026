from flask import Blueprint, jsonify

from app.extensions import db
from app.models.tournament import Tournament
from app.services.bracket_service import BracketService
from app.services.standings_service import StandingsService

competitions_bp = Blueprint("competitions", __name__)
standings_service = StandingsService()
bracket_service = BracketService()


def _list_competitions() -> list[Tournament]:
    return list(
        db.session.scalars(
            db.select(Tournament).order_by(Tournament.sort_order, Tournament.name)
        ).all()
    )


@competitions_bp.route("")
def list_competitions():
    competitions = [t.to_dict() for t in _list_competitions()]
    # group by region for the selector
    regions: dict[str, dict] = {}
    for comp in competitions:
        key = comp["region_key"]
        region = regions.setdefault(
            key,
            {"key": key, "label": comp["region_label"], "competitions": []},
        )
        region["competitions"].append(comp)
    grouped = sorted(
        regions.values(),
        key=lambda r: min(c["sort_order"] for c in r["competitions"]),
    )
    return jsonify({"competitions": competitions, "regions": grouped})


@competitions_bp.route("/<slug>")
def get_competition(slug: str):
    tournament = db.session.scalars(
        db.select(Tournament).where(Tournament.external_key == slug)
    ).first()
    if not tournament:
        return jsonify({"error": "Competition not found"}), 404
    return jsonify(tournament.to_dict())


@competitions_bp.route("/<slug>/standings")
def get_standings(slug: str):
    standings = standings_service.get_standings(slug)
    if standings is None:
        return jsonify({"error": "Competition not found"}), 404
    return jsonify(standings)


@competitions_bp.route("/<slug>/bracket")
def get_bracket(slug: str):
    bracket = bracket_service.get_bracket(slug)
    if bracket is None:
        return jsonify({"error": "Competition not found"}), 404
    return jsonify(bracket)

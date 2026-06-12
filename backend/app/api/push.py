from flask import Blueprint, jsonify, request

from app.services.push_service import PushService

push_bp = Blueprint("push", __name__)


@push_bp.route("/vapid-public-key")
def vapid_public_key():
    service = PushService()
    public_key = service.get_vapid_public_key()
    if not public_key:
        return jsonify({"error": "Push notifications are not configured"}), 503
    return jsonify({"publicKey": public_key})


@push_bp.route("/subscribe", methods=["POST"])
def subscribe():
    payload = request.get_json(silent=True) or {}
    endpoint = payload.get("endpoint")
    keys = payload.get("keys") or {}
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")

    if not endpoint or not p256dh or not auth:
        return jsonify({"error": "Invalid subscription payload"}), 400

    service = PushService()
    if not service.is_configured():
        return jsonify({"error": "Push notifications are not configured"}), 503

    subscription = service.upsert_subscription(
        endpoint=endpoint,
        p256dh=p256dh,
        auth=auth,
        timezone_name=payload.get("timezone"),
    )
    return jsonify({"id": subscription.id, "subscribed": True})


@push_bp.route("/unsubscribe", methods=["DELETE"])
def unsubscribe():
    payload = request.get_json(silent=True) or {}
    endpoint = payload.get("endpoint")
    if not endpoint:
        return jsonify({"error": "endpoint is required"}), 400

    service = PushService()
    removed = service.remove_subscription(endpoint)
    return jsonify({"removed": removed})

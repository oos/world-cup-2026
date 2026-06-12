import json
import logging
from datetime import datetime, timedelta, timezone

from flask import current_app
from pywebpush import WebPushException, webpush
from sqlalchemy import select

from app.extensions import db
from app.models.match import Match
from app.models.push_subscription import PushSubscription, SentMatchNotification
from app.utils.match_time import parse_match_kickoff

logger = logging.getLogger(__name__)

REMINDER_MINUTES = 15
KICKOFF_WINDOW = timedelta(minutes=5)


def _is_unplayed(match: Match) -> bool:
    if match.score is None:
        return True
    if isinstance(match.score, dict) and match.score.get("ft"):
        return False
    return True


class PushService:
    def get_vapid_public_key(self) -> str | None:
        return current_app.config.get("VAPID_PUBLIC_KEY") or None

    def is_configured(self) -> bool:
        return bool(
            current_app.config.get("VAPID_PUBLIC_KEY")
            and current_app.config.get("VAPID_PRIVATE_KEY")
        )

    def upsert_subscription(
        self,
        endpoint: str,
        p256dh: str,
        auth: str,
        timezone_name: str | None = None,
    ) -> PushSubscription:
        subscription = db.session.scalars(
            select(PushSubscription).where(PushSubscription.endpoint == endpoint)
        ).first()

        if subscription:
            subscription.p256dh = p256dh
            subscription.auth = auth
            subscription.timezone = timezone_name
        else:
            subscription = PushSubscription(
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth,
                timezone=timezone_name,
            )
            db.session.add(subscription)

        db.session.commit()
        return subscription

    def remove_subscription(self, endpoint: str) -> bool:
        subscription = db.session.scalars(
            select(PushSubscription).where(PushSubscription.endpoint == endpoint)
        ).first()
        if not subscription:
            return False

        db.session.delete(subscription)
        db.session.commit()
        return True

    def send_match_reminders(self) -> dict:
        if not self.is_configured():
            return {"skipped": True, "reason": "VAPID keys not configured"}

        now = datetime.now(timezone.utc)
        matches = [
            match
            for match in db.session.scalars(select(Match).where(Match.match_date.isnot(None))).all()
            if _is_unplayed(match)
        ]
        subscriptions = db.session.scalars(select(PushSubscription)).all()

        if not subscriptions:
            return {"matches_checked": len(matches), "sent": 0}

        sent = 0
        for match in matches:
            kickoff = parse_match_kickoff(match.match_date, match.match_time)
            if not kickoff or kickoff <= now:
                continue

            notification_type = None
            title = None
            body = None

            reminder_at = kickoff - timedelta(minutes=REMINDER_MINUTES)
            if now >= reminder_at and now < reminder_at + KICKOFF_WINDOW:
                notification_type = "reminder"
                title = "Match starting soon"
                body = self._match_body(match, "Kickoff in 15 minutes")
            elif now >= kickoff and now < kickoff + KICKOFF_WINDOW:
                notification_type = "kickoff"
                title = "Match kicking off now"
                body = self._match_body(match, "Live now")

            if not notification_type:
                continue

            for subscription in subscriptions:
                if self._already_sent(match.id, subscription.id, notification_type):
                    continue
                if self._send_push(subscription, title, body, match.id):
                    self._mark_sent(match.id, subscription.id, notification_type)
                    sent += 1

        return {"matches_checked": len(matches), "sent": sent}

    def _match_body(self, match: Match, prefix: str) -> str:
        team1 = match.team1.name if match.team1 else "TBD"
        team2 = match.team2.name if match.team2 else "TBD"
        flags = ""
        if match.team1 and match.team2:
            flags = f"{match.team1.flag_icon or ''} vs {match.team2.flag_icon or ''} · "
        return f"{prefix}: {flags}{team1} vs {team2}"

    def _already_sent(self, match_id: int, subscription_id: int, notification_type: str) -> bool:
        existing = db.session.scalars(
            select(SentMatchNotification).where(
                SentMatchNotification.match_id == match_id,
                SentMatchNotification.subscription_id == subscription_id,
                SentMatchNotification.notification_type == notification_type,
            )
        ).first()
        return existing is not None

    def _mark_sent(self, match_id: int, subscription_id: int, notification_type: str) -> None:
        db.session.add(
            SentMatchNotification(
                match_id=match_id,
                subscription_id=subscription_id,
                notification_type=notification_type,
            )
        )
        db.session.commit()

    def _send_push(
        self,
        subscription: PushSubscription,
        title: str,
        body: str,
        match_id: int,
    ) -> bool:
        payload = json.dumps(
            {
                "title": title,
                "body": body,
                "url": f"/matches/{match_id}",
            }
        )
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=payload,
                vapid_private_key=current_app.config["VAPID_PRIVATE_KEY"],
                vapid_claims={"sub": current_app.config["VAPID_CONTACT_EMAIL"]},
            )
            return True
        except WebPushException as exc:
            status = exc.response.status_code if exc.response is not None else None
            logger.warning("Push failed for subscription %s: %s", subscription.id, exc)
            if status in (404, 410):
                db.session.delete(subscription)
                db.session.commit()
            return False

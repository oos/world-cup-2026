import re
from datetime import date, datetime, timedelta, timezone

MATCH_TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})\s+UTC([+-])(\d{1,2})(?::(\d{2}))?$")
SIMPLE_TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})$")


def parse_match_kickoff(match_date: date | None, match_time: str | None) -> datetime | None:
    if not match_date:
        return None

    if not match_time:
        return datetime.combine(match_date, datetime.min.time().replace(hour=12), tzinfo=timezone.utc)

    match = MATCH_TIME_RE.match(match_time)
    if match:
        hours, minutes, sign, offset_hours, offset_minutes = match.groups()
        offset = timedelta(
            hours=int(offset_hours),
            minutes=int(offset_minutes or 0),
        )
        if sign == "-":
            offset = -offset
        local = datetime.combine(
            match_date,
            datetime.min.time().replace(hour=int(hours), minute=int(minutes)),
            tzinfo=timezone(offset),
        )
        return local.astimezone(timezone.utc)

    simple = SIMPLE_TIME_RE.match(match_time)
    if simple:
        hours, minutes = simple.groups()
        return datetime.combine(
            match_date,
            datetime.min.time().replace(hour=int(hours), minute=int(minutes)),
            tzinfo=timezone.utc,
        )

    return datetime.combine(match_date, datetime.min.time().replace(hour=12), tzinfo=timezone.utc)

import re
from datetime import date


def team_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return slug or "team"


def build_match_key(
    match_date: date | str | None,
    team1_name: str | None,
    team2_name: str | None,
) -> str:
    teams = sorted([team1_name or "", team2_name or ""])
    if isinstance(match_date, date):
        date_str = match_date.isoformat()
    else:
        date_str = match_date or "unknown"
    return f"{date_str}-{team_slug(teams[0])}-vs-{team_slug(teams[1])}"

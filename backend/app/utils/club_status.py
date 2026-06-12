CLUB_STATUS_NONE = "none"
CLUB_STATUS_UNAVAILABLE = "unavailable"
CLUB_STATUS_RETIRED = "retired"

CLUB_STATUS_LABELS = {
    CLUB_STATUS_NONE: "No current club",
    CLUB_STATUS_UNAVAILABLE: "Unavailable",
    CLUB_STATUS_RETIRED: "Retired",
}


def club_label(
    club: str | None,
    club_status: str | None,
    *,
    wikidata_id: str | None = None,
) -> str:
    if club and club.strip():
        return club.strip()
    if club_status and club_status in CLUB_STATUS_LABELS:
        return CLUB_STATUS_LABELS[club_status]
    if not wikidata_id:
        return CLUB_STATUS_LABELS[CLUB_STATUS_UNAVAILABLE]
    return CLUB_STATUS_LABELS[CLUB_STATUS_UNAVAILABLE]


def club_status_from_career(club_stints: list) -> tuple[str | None, str | None]:
    """Return (club_name, club_status) from career club stints."""
    if not club_stints:
        return None, CLUB_STATUS_NONE

    current = [stint for stint in club_stints if getattr(stint, "is_current", False)]
    if current:
        return current[-1].team_name, None

    return None, CLUB_STATUS_NONE


def default_club_status_for_missing_club(wikidata_id: str | None) -> str:
    return CLUB_STATUS_UNAVAILABLE

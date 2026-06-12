import re
import unicodedata


def normalize_player_name(name: str) -> str:
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    name = re.sub(r"\s+", " ", name).strip().lower()
    name = name.rstrip(".,;:")
    name = re.sub(r"\s+jr\.?$", "", name)
    return name


def player_profile_rank(player: dict) -> tuple:
    name = (player.get("name") or "").strip()
    return (
        1 if player.get("club") else 0,
        1 if player.get("jersey_number") is not None else 0,
        1 if player.get("image_url") else 0,
        1 if player.get("dob") else 0,
        1 if player.get("height_cm") else 0,
        0 if name.endswith(".") else 1,
        -len(name),
    )


def dedupe_players(players: list[dict], *, same_team: bool = False) -> list[dict]:
    best_by_key: dict[str | tuple[str, str], dict] = {}
    for player in players:
        normalized = normalize_player_name(player.get("name") or "")
        if not normalized:
            continue
        key: str | tuple[str, str] = (
            normalized if same_team else (player.get("team_name") or "", normalized)
        )
        existing = best_by_key.get(key)
        if existing is None or player_profile_rank(player) > player_profile_rank(existing):
            best_by_key[key] = player
    return list(best_by_key.values())

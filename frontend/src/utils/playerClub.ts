import type { Player, PlayerCareer } from "../api/client";

export function getClubDisplayLabel(player: Pick<Player, "club" | "club_label" | "club_status">): string {
  if (player.club_label) return player.club_label;
  if (player.club?.trim()) return player.club.trim();
  if (player.club_status === "none") return "No current club";
  if (player.club_status === "retired") return "Retired";
  return "Unavailable";
}

export function getClubDisplayLabelWithCareer(
  player: Pick<Player, "club" | "club_label" | "club_status">,
  career: PlayerCareer | null | undefined
): string {
  if (player.club?.trim()) return player.club.trim();
  if (player.club_label && player.club_label !== "Unavailable") {
    return player.club_label;
  }

  const currentClub = career?.club_history.find((stint) => stint.is_current);
  if (currentClub?.team_name) return currentClub.team_name;
  if (career?.club_history.length) return "No current club";

  return getClubDisplayLabel(player);
}

export function hasClubName(
  player: Pick<Player, "club">,
  career?: PlayerCareer | null
): boolean {
  if (player.club?.trim()) return true;
  return Boolean(career?.club_history.some((stint) => stint.is_current));
}

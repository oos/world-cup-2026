import { useState } from "react";
import type { Player } from "../api/client";

type AvatarSize = "sm" | "lg";

const POSITION_COLORS: Record<string, string> = {
  GK: "#59a5d8",
  DEF: "#44af69",
  MID: "#2b9eb3",
  FWD: "#d17a22",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getPositionColor(position: string | null | undefined): string {
  if (!position) return "#6d7794";
  const key = position.toUpperCase();
  if (key.startsWith("GK")) return POSITION_COLORS.GK;
  if (key.startsWith("DF") || key.startsWith("DEF")) return POSITION_COLORS.DEF;
  if (key.startsWith("MF") || key.startsWith("MID")) return POSITION_COLORS.MID;
  if (key.startsWith("FW") || key.startsWith("FWD")) return POSITION_COLORS.FWD;
  return "#6d7794";
}

export function PlayerAvatar({
  player,
  size = "sm",
  className = "",
}: {
  player: Pick<Player, "name" | "image_url" | "position">;
  size?: AvatarSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(player.image_url) && !failed;
  const sizeClass = size === "lg" ? "player-avatar--lg" : "player-avatar--sm";

  if (showImage) {
    return (
      <img
        src={player.image_url!}
        alt={player.name}
        className={`player-avatar ${sizeClass} ${className}`.trim()}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`player-avatar player-avatar--initials ${sizeClass} ${className}`.trim()}
      style={{ backgroundColor: getPositionColor(player.position) }}
      aria-hidden="true"
    >
      {getInitials(player.name)}
    </div>
  );
}

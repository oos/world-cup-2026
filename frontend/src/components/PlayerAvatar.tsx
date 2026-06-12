import { UserRound } from "lucide-react";

type AvatarSize = "sm" | "lg";

const ICON_SIZES: Record<AvatarSize, number> = {
  sm: 20,
  lg: 56,
};

export function PlayerAvatar({
  size = "sm",
  className = "",
}: {
  size?: AvatarSize;
  className?: string;
}) {
  const sizeClass = size === "lg" ? "player-avatar--lg" : "player-avatar--sm";

  return (
    <div
      className={`player-avatar ${sizeClass} ${className}`.trim()}
      aria-hidden="true"
    >
      <UserRound
        size={ICON_SIZES[size]}
        strokeWidth={1.75}
        className="player-avatar__icon"
      />
    </div>
  );
}

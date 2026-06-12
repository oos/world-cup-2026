import { Flag } from "lucide-react";
import { getTeamFlagUrl } from "../utils/teamFlag";

type TeamFlagProps = {
  fifaCode?: string | null;
  teamName?: string | null;
  variant?: "card" | "badge" | "hero";
  className?: string;
};

const PLACEHOLDER_ICON: Record<NonNullable<TeamFlagProps["variant"]>, number> = {
  badge: 12,
  card: 22,
  hero: 28,
};

export function TeamFlag({
  fifaCode,
  teamName,
  variant = "card",
  className = "",
}: TeamFlagProps) {
  const src = getTeamFlagUrl(fifaCode, teamName);
  const baseClass =
    variant === "badge"
      ? "team-flag-badge"
      : variant === "hero"
        ? "team-hero-flag"
        : "team-card-flag";
  const fallbackClass =
    variant === "badge"
      ? "team-flag-badge--fallback"
      : variant === "hero"
        ? "team-hero-flag--fallback"
        : "team-card-flag--fallback";

  if (!src) {
    return (
      <div
        className={`${baseClass} ${fallbackClass} team-flag--placeholder ${className}`.trim()}
        aria-hidden="true"
      >
        <Flag size={PLACEHOLDER_ICON[variant]} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`${baseClass} ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  );
}

import { getTeamFlagUrl } from "../utils/teamFlag";

type TeamFlagProps = {
  fifaCode?: string | null;
  teamName?: string | null;
  variant?: "card" | "badge";
  className?: string;
};

export function TeamFlag({
  fifaCode,
  teamName,
  variant = "card",
  className = "",
}: TeamFlagProps) {
  const src = getTeamFlagUrl(fifaCode, teamName);
  const baseClass = variant === "badge" ? "team-flag-badge" : "team-card-flag";
  const fallbackClass =
    variant === "badge" ? "team-flag-badge--fallback" : "team-card-flag--fallback";

  if (!src) {
    return (
      <div
        className={`${baseClass} ${fallbackClass} ${className}`.trim()}
        aria-hidden="true"
      />
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

import { TeamFlag } from "./TeamFlag";
import {
  formatTeamWorldRanking,
  getTeamWorldRanking,
} from "../utils/teamWorldRanking";

type TeamNameWithFlagProps = {
  name: string;
  fifaCode?: string | null;
  flagIso?: string | null;
  worldRanking?: number | null;
  showWorldRanking?: boolean;
  inlineWorldRanking?: boolean;
  variant?: "card" | "badge" | "hero";
  className?: string;
  flagClassName?: string;
  nameClassName?: string;
  rankClassName?: string;
  flagAfter?: boolean;
};

export function TeamNameWithFlag({
  name,
  fifaCode,
  flagIso,
  worldRanking,
  showWorldRanking = true,
  inlineWorldRanking = false,
  variant = "badge",
  className = "",
  flagClassName = "",
  nameClassName = "",
  rankClassName = "",
  flagAfter = false,
}: TeamNameWithFlagProps) {
  const ranking =
    showWorldRanking && name !== "TBD"
      ? getTeamWorldRanking(fifaCode, worldRanking)
      : null;

  const flag = (
    <TeamFlag
      fifaCode={fifaCode}
      teamName={name}
      flagIso={flagIso}
      variant={variant}
      className={flagClassName}
    />
  );
  const rank = ranking != null && (
    <span
      className={`team-world-rank ${rankClassName}`.trim()}
      aria-label={`FIFA world ranking ${ranking}`}
    >
      {formatTeamWorldRanking(ranking)}
    </span>
  );
  const label = (
    <span className={`team-name-with-flag__name ${nameClassName}`.trim()}>{name}</span>
  );
  const nameWithInlineRank = inlineWorldRanking ? (
    <span className="team-name-with-flag__label-group">
      {label}
      {rank}
    </span>
  ) : (
    label
  );

  return (
    <span className={`team-name-with-flag ${className}`.trim()}>
      <span className="team-name-with-flag__text">
        <span className="team-name-with-flag__name-row">
          {!flagAfter && flag}
          {nameWithInlineRank}
          {flagAfter && flag}
        </span>
        {!inlineWorldRanking && rank}
      </span>
    </span>
  );
}

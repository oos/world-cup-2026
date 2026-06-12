import { TeamFlag } from "./TeamFlag";

type TeamNameWithFlagProps = {
  name: string;
  fifaCode?: string | null;
  flagIso?: string | null;
  variant?: "card" | "badge" | "hero";
  className?: string;
  flagClassName?: string;
  nameClassName?: string;
  flagAfter?: boolean;
};

export function TeamNameWithFlag({
  name,
  fifaCode,
  flagIso,
  variant = "badge",
  className = "",
  flagClassName = "",
  nameClassName = "",
  flagAfter = false,
}: TeamNameWithFlagProps) {
  const flag = (
    <TeamFlag
      fifaCode={fifaCode}
      teamName={name}
      flagIso={flagIso}
      variant={variant}
      className={flagClassName}
    />
  );
  const label = (
    <span className={`team-name-with-flag__name ${nameClassName}`.trim()}>{name}</span>
  );

  return (
    <span className={`team-name-with-flag ${className}`.trim()}>
      {flagAfter ? (
        <>
          {label}
          {flag}
        </>
      ) : (
        <>
          {flag}
          {label}
        </>
      )}
    </span>
  );
}

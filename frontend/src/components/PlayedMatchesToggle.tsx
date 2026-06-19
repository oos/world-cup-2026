import { ChevronDown, ChevronUp } from "lucide-react";

export function PlayedMatchesToggle({
  expanded,
  playedCount,
  onToggle,
}: {
  expanded: boolean;
  playedCount: number;
  onToggle: () => void;
}) {
  if (playedCount <= 0) return null;

  const label = expanded
    ? `Hide fixtures already played (${playedCount})`
    : `Show fixtures already played (${playedCount})`;

  return (
    <button
      type="button"
      className={`matches-played-toggle${expanded ? " is-expanded" : ""}`}
      onClick={onToggle}
      aria-expanded={expanded}
    >
      <span className="matches-played-toggle-label">{label}</span>
      {expanded ? (
        <ChevronUp size={16} strokeWidth={2.25} aria-hidden="true" />
      ) : (
        <ChevronDown size={16} strokeWidth={2.25} aria-hidden="true" />
      )}
    </button>
  );
}

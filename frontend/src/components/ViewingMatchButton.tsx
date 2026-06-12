import { Bookmark } from "lucide-react";
import { useViewingMatches } from "../hooks/useViewingMatches";

type ViewingMatchButtonProps = {
  matchId: number;
  className?: string;
};

export function ViewingMatchButton({ matchId, className = "" }: ViewingMatchButtonProps) {
  const { isViewing, toggleViewing } = useViewingMatches();
  const viewing = isViewing(matchId);
  const label = viewing ? "Remove from viewing matches" : "Add to viewing matches";

  return (
    <button
      type="button"
      className={`viewing-match-btn ${viewing ? "is-viewing" : ""} ${className}`.trim()}
      aria-pressed={viewing}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleViewing(matchId);
      }}
    >
      <Bookmark
        size={18}
        strokeWidth={2.1}
        fill={viewing ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}

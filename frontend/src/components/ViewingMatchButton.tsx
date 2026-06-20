import { Bookmark } from "lucide-react";
import { useBookmarkAccountPrompt } from "../context/BookmarkAccountPromptContext";
import { useViewingMatches } from "../hooks/useViewingMatches";

type ViewingMatchButtonProps = {
  matchId: number;
  className?: string;
};

export function ViewingMatchButton({ matchId, className = "" }: ViewingMatchButtonProps) {
  const { isViewing, toggleViewing } = useViewingMatches();
  const { confirmGuestBookmark } = useBookmarkAccountPrompt();
  const viewing = isViewing(matchId);
  const label = viewing ? "Remove from saved fixtures" : "Save fixture";

  return (
    <button
      type="button"
      className={`viewing-match-btn ${viewing ? "is-viewing" : ""} ${className}`.trim()}
      aria-pressed={viewing}
      aria-label={label}
      data-track-button={viewing ? "remove_saved_fixture" : "save_fixture"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (viewing) {
          toggleViewing(matchId);
          return;
        }
        confirmGuestBookmark(() => {
          toggleViewing(matchId);
        });
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

import { Bookmark } from "lucide-react";
import { useState } from "react";
import { useBookmarkAccountPrompt } from "../context/BookmarkAccountPromptContext";
import {
  type SavedItemSnapshot,
  type SavedItemType,
  useSavedItems,
} from "../hooks/useSavedItems";

type SaveItemButtonProps = {
  itemType: SavedItemType;
  itemId: number;
  snapshot: SavedItemSnapshot;
  className?: string;
};

export function SaveItemButton({
  itemType,
  itemId,
  snapshot,
  className = "",
}: SaveItemButtonProps) {
  const { isSaved, toggleSaved } = useSavedItems();
  const { confirmGuestBookmark } = useBookmarkAccountPrompt();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = isSaved(itemType, itemId);
  const label = saved ? "Remove from saved items" : "Save to saved items";

  const handleClick = async () => {
    if (saved) {
      setBusy(true);
      setError(null);
      try {
        await toggleSaved(itemType, itemId, snapshot);
      } catch (toggleError) {
        setError(
          toggleError instanceof Error
            ? toggleError.message
            : "Could not update saved items.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    confirmGuestBookmark(async () => {
      setBusy(true);
      setError(null);
      try {
        await toggleSaved(itemType, itemId, snapshot);
      } catch (toggleError) {
        setError(
          toggleError instanceof Error
            ? toggleError.message
            : "Could not update saved items.",
        );
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <div className={`save-item-control ${className}`.trim()}>
      <button
        type="button"
        className={`save-item-btn ${saved ? "is-saved" : ""}`}
        aria-pressed={saved}
        aria-label={label}
        data-track-button={saved ? "remove_saved_item" : "save_item"}
        disabled={busy}
        onClick={() => void handleClick()}
      >
        <Bookmark
          size={18}
          strokeWidth={2.1}
          fill={saved ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
      {error && <p className="save-item-error">{error}</p>}
    </div>
  );
}

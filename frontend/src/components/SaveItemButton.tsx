import { Bookmark } from "lucide-react";
import { useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = isSaved(itemType, itemId);
  const label = saved ? "Remove from saved items" : "Save to saved items";

  const handleClick = async () => {
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
  };

  return (
    <div className={`save-item-control ${className}`.trim()}>
      <button
        type="button"
        className={`save-item-btn ${saved ? "is-saved" : ""}`}
        aria-pressed={saved}
        aria-label={label}
        disabled={busy}
        onClick={() => void handleClick()}
      >
        <Bookmark size={16} strokeWidth={2.1} aria-hidden="true" />
        {saved ? "Saved" : "Save"}
      </button>
      {error && <p className="save-item-error">{error}</p>}
    </div>
  );
}

import { X } from "lucide-react";

export type ActiveFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

export function ActiveFilterBar({
  filters,
  onClearAll,
  clearLabel = "Clear all filters",
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
  clearLabel?: string;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="active-filter-bar">
      <div className="active-filter-chips" aria-label="Active filters">
        {filters.map((filter) => (
          <span key={filter.key} className="active-filter-chip">
            <span className="active-filter-chip-label">{filter.label}</span>
            <button
              type="button"
              className="active-filter-chip-remove"
              onClick={filter.onRemove}
              aria-label={`Remove ${filter.label}`}
            >
              <X size={14} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <button type="button" className="active-filter-clear" onClick={onClearAll}>
        {clearLabel}
      </button>
    </div>
  );
}

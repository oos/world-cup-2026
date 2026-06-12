import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "list";

export function ViewModeToggle({
  value,
  onToggle,
}: {
  value: ViewMode;
  onToggle: () => void;
}) {
  const nextMode: ViewMode = value === "grid" ? "list" : "grid";
  const Icon = value === "grid" ? List : LayoutGrid;

  return (
    <button
      type="button"
      className="page-toolbar-btn"
      onClick={onToggle}
      aria-label={`Switch to ${nextMode} view`}
      title={`Switch to ${nextMode} view`}
    >
      <Icon size={15} strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}

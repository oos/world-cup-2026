import type { LucideIcon } from "lucide-react";
import { slugifyTrackName } from "../ads/buttonTracking";

export type SortOption<T extends string> = {
  value: T;
  label: string;
  icon: LucideIcon;
};

export function SortCycleToggle<T extends string>({
  value,
  options,
  defaultValue,
  onChange,
}: {
  value: T;
  options: SortOption<T>[];
  defaultValue: T;
  onChange: (value: T) => void;
}) {
  const currentIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const current = options[currentIndex];
  const next = options[(currentIndex + 1) % options.length];
  const Icon = current.icon;
  const isDefault = value === defaultValue;

  return (
    <button
      type="button"
      className={`page-toolbar-btn page-toolbar-btn--sort ${!isDefault ? "has-selection" : ""}`}
      onClick={() => onChange(next.value)}
      data-track-button={`sort_${slugifyTrackName(current.value)}`}
      aria-label={`Sort: ${current.label}. Click for ${next.label}`}
      title={`${current.label} · click for ${next.label}`}
    >
      <Icon size={15} strokeWidth={2.25} aria-hidden="true" />
      {!isDefault && <span className="page-toolbar-btn-dot" aria-hidden="true" />}
    </button>
  );
}

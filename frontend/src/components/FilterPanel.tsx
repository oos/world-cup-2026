import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { slugifyTrackName } from "../ads/buttonTracking";
import { useFilterPanel } from "../context/FilterPanelContext";
import { useIsDesktop } from "../hooks/useMediaQuery";

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M7 12h10M10 17h4"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 9l4-4 4 4M12 5v14M16 15l-4 4-4-4"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FilterToggle() {
  const {
    toggleFilter,
    filterActiveCount,
    hasFilters,
    isOpen,
    activePanel,
    isRailMounted,
  } = useFilterPanel();

  // When a persistent desktop rail is showing the filters, the toggle is
  // redundant.
  if (!hasFilters || isRailMounted) return null;

  const isActive = isOpen && activePanel === "filter";

  return (
    <button
      type="button"
      className={`page-toolbar-btn page-toolbar-btn--filter ${isActive ? "is-open" : ""} ${
        filterActiveCount > 0 ? "has-selection" : ""
      }`}
      onClick={toggleFilter}
      data-track-button="open_filters"
      aria-label={
        filterActiveCount > 0 ? `Filters (${filterActiveCount} active)` : "Open filters"
      }
      aria-pressed={isActive}
    >
      <FilterIcon />
      {filterActiveCount > 0 && (
        <span className="page-toolbar-btn-dot" aria-hidden="true" />
      )}
    </button>
  );
}

export function SortToggle() {
  const { toggleSort, sortActiveCount, hasSort, isOpen, activePanel } = useFilterPanel();

  if (!hasSort) return null;

  const isActive = isOpen && activePanel === "sort";

  return (
    <button
      type="button"
      className={`page-toolbar-btn page-toolbar-btn--sort ${isActive ? "is-open" : ""} ${
        sortActiveCount > 0 ? "has-selection" : ""
      }`}
      onClick={toggleSort}
      data-track-button="open_sort_options"
      aria-label={sortActiveCount > 0 ? `Sort (${sortActiveCount} active)` : "Open sort options"}
      aria-pressed={isActive}
    >
      <SortIcon />
      {sortActiveCount > 0 && (
        <span className="page-toolbar-btn-dot" aria-hidden="true" />
      )}
    </button>
  );
}

export function FilterSidePanel() {
  const {
    isOpen,
    activePanel,
    filterTitle,
    filterContent,
    sortTitle,
    sortContent,
    hasFilters,
    hasSort,
    isRailMounted,
    close,
  } = useFilterPanel();

  // The filters live in the persistent rail on desktop; only the sort drawer
  // (if any) should remain reachable from the off-canvas panel.
  const filtersInDrawer = hasFilters && !isRailMounted;

  if (!filtersInDrawer && !hasSort) return null;

  const title = activePanel === "sort" ? sortTitle : filterTitle;
  const content = activePanel === "sort" ? sortContent : filterContent;

  return (
    <>
      <div
        className={`filter-backdrop ${isOpen ? "open" : ""}`}
        onClick={close}
        aria-hidden={!isOpen}
      />
      <aside
        className={`filter-panel ${isOpen ? "open" : ""}`}
        aria-label={title}
        aria-hidden={!isOpen}
      >
        <div className="filter-panel-header">
          <h2>{title}</h2>
          <button type="button" className="filter-panel-close" onClick={close} aria-label="Close panel" data-track-button="close_filter_panel">
            ✕
          </button>
        </div>
        <div className="filter-panel-body">{content}</div>
      </aside>
    </>
  );
}

/**
 * Persistent desktop filter rail. Renders the page's registered filter content
 * inline (instead of the off-canvas drawer) and flags the context so the toggle
 * and drawer suppress themselves while mounted.
 */
export function FilterRail() {
  const { filterTitle, filterContent, hasFilters, setRailMounted } = useFilterPanel();

  useEffect(() => {
    setRailMounted(true);
    return () => setRailMounted(false);
  }, [setRailMounted]);

  if (!hasFilters) return null;

  return (
    <aside className="filter-rail" aria-label={filterTitle}>
      <div className="filter-rail-header">
        <h2 className="filter-rail-title">{filterTitle}</h2>
      </div>
      <div className="filter-rail-body">{filterContent}</div>
    </aside>
  );
}

/**
 * Wraps a page's content so that, on desktop, the registered filters appear in a
 * persistent left rail beside the content. Below the desktop breakpoint (or when
 * disabled) it renders children untouched so the mobile drawer flow is preserved.
 */
export function FilterRailLayout({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const isDesktop = useIsDesktop();

  if (!enabled || !isDesktop) return <>{children}</>;

  return (
    <div className="rail-layout">
      <FilterRail />
      <div className="rail-layout-main">{children}</div>
    </div>
  );
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  layout?: "options" | "field";
}

export function FilterSection({ title, children, layout = "options" }: FilterSectionProps) {
  return (
    <div className="filter-section">
      <h3 className="filter-section-title">{title}</h3>
      {layout === "field" ? (
        <div className="filter-field">{children}</div>
      ) : (
        <div className="filter-options">{children}</div>
      )}
    </div>
  );
}

interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  id: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
}

function FilterSelectChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`filter-select-chevron ${open ? "open" : ""}`}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FilterSelect({ id, value, options, onChange }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div className={`filter-select ${open ? "open" : ""}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        className="filter-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-track-button={`filter_select_${slugifyTrackName(id)}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="filter-select-value">{selected.label}</span>
        <FilterSelectChevron open={open} />
      </button>
      {open && (
        <ul className="filter-select-menu" role="listbox" aria-labelledby={id}>
          {options.map((option) => (
            <li key={option.value || "all"} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`filter-select-option ${option.value === value ? "active" : ""}`}
                data-track-button={`filter_option_${slugifyTrackName(id)}_${slugifyTrackName(option.value || "all")}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface FilterMultiSelectProps {
  id: string;
  values: string[];
  options: FilterSelectOption[];
  placeholder?: string;
  onChange: (values: string[]) => void;
}

export function FilterMultiSelect({
  id,
  values,
  options,
  placeholder = "All",
  onChange,
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayLabel =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? (options.find((option) => option.value === values[0])?.label ?? values[0])
        : `${values.length} selected`;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((current) => current !== value));
      return;
    }
    onChange([...values, value]);
  };

  return (
    <div className={`filter-select filter-multi-select ${open ? "open" : ""}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        className="filter-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-track-button={`filter_multi_select_${slugifyTrackName(id)}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="filter-select-value">{displayLabel}</span>
        <FilterSelectChevron open={open} />
      </button>
      {open && (
        <ul
          className="filter-select-menu"
          role="listbox"
          aria-labelledby={id}
          aria-multiselectable="true"
        >
          {options.map((option) => {
            const selected = values.includes(option.value);
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`filter-select-option filter-multi-select-option${
                    selected ? " active" : ""
                  }`}
                  data-track-button={`filter_multi_option_${slugifyTrackName(id)}_${slugifyTrackName(option.value)}`}
                  onClick={() => toggleValue(option.value)}
                >
                  <span className="filter-checkbox-box" aria-hidden="true">
                    {selected ? "✓" : ""}
                  </span>
                  <span className="filter-multi-select-label">{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface FilterOptionProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function FilterOption({ label, active, onClick }: FilterOptionProps) {
  return (
    <button
      type="button"
      className={`filter-option ${active ? "active" : ""}`}
      data-track-button={`filter_option_${slugifyTrackName(label)}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

interface FilterCheckboxOptionProps {
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
}

export function FilterCheckboxOption({
  label,
  checked,
  onChange,
}: FilterCheckboxOptionProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={`filter-checkbox-option ${checked ? "active" : ""}`}
      data-track-button={`filter_checkbox_${slugifyTrackName(label)}`}
      onClick={() => onChange(!checked)}
    >
      <span className="filter-checkbox-box" aria-hidden="true">
        {checked ? "✓" : ""}
      </span>
      <span className="filter-checkbox-label">{label}</span>
    </button>
  );
}

interface FilterPanelFooterProps {
  onClear: () => void;
  onApply: () => void;
  clearLabel?: string;
  applyLabel?: string;
}

export function FilterPanelFooter({
  onClear,
  onApply,
  clearLabel = "Clear filters",
  applyLabel = "Apply",
}: FilterPanelFooterProps) {
  return (
    <div className="filter-panel-footer">
      <button type="button" className="filter-panel-btn filter-panel-btn--ghost" onClick={onClear} data-track-button="clear_filters">
        {clearLabel}
      </button>
      <button type="button" className="filter-panel-btn filter-panel-btn--primary" onClick={onApply} data-track-button="apply_filters">
        {applyLabel}
      </button>
    </div>
  );
}

interface FilterLinkProps {
  label: string;
  to: string;
  active?: boolean;
}

export function FilterLink({ label, to, active }: FilterLinkProps) {
  return (
    <Link
      to={to}
      className={`filter-option ${active ? "active" : ""}`}
      data-track-button={`filter_link_${slugifyTrackName(label)}`}
    >
      {label}
    </Link>
  );
}

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useCompetition } from "../context/CompetitionContext";

function competitionLabel(name: string, tier: number | null | undefined) {
  return tier ? `${name} (Tier ${tier})` : name;
}

export function CompetitionSelector({ onSelect }: { onSelect?: () => void }) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { regions, slug, competition, setCompetition, loading } = useCompetition();
  const [open, setOpen] = useState(false);

  const selectedLabel = competition
    ? competitionLabel(competition.name, competition.tier)
    : "Select competition";

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelect = (nextSlug: string) => {
    setCompetition(nextSlug);
    setOpen(false);
    onSelect?.();
  };

  if (loading && regions.length === 0) {
    return (
      <div className="competition-selector">
        <span className="competition-selector-label">Competition</span>
        <div className="competition-selector-loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="competition-selector" ref={rootRef}>
      <span className="competition-selector-label" id={`${listId}-label`}>
        Competition
      </span>
      <button
        type="button"
        className={`competition-selector-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${listId}-label`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="competition-selector-trigger-text">{selectedLabel}</span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          className="competition-selector-chevron"
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="competition-selector-panel" id={listId} role="listbox" aria-labelledby={`${listId}-label`}>
          {regions.map((region) => (
            <div key={region.key} className="competition-selector-group">
              <div className="competition-selector-group-label">{region.label}</div>
              <ul className="competition-selector-options">
                {region.competitions.map((comp) => {
                  const active = comp.slug === slug;
                  return (
                    <li key={comp.slug}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`competition-selector-option ${active ? "active" : ""}`}
                        onClick={() => handleSelect(comp.slug)}
                      >
                        {competitionLabel(comp.name, comp.tier)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

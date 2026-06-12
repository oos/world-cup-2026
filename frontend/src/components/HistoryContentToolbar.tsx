import { useEffect, useMemo, useRef, useState } from "react";
import type { HistoryMatch } from "../api/client";
import { FilterSection, FilterSelect } from "./FilterPanel";
import { SearchInput } from "./SearchInput";
import { getHistoryTeamContinent, HISTORY_CONTINENTS } from "../utils/historyTeamContinent";
import { normalizeHistoryTeamName } from "../utils/historyTeamNames";

type HistoryTab = "all" | "year";

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

function collectTeams(matches: HistoryMatch[]) {
  const teams = new Set<string>();
  for (const match of matches) {
    if (match.team1) teams.add(normalizeHistoryTeamName(match.team1));
    if (match.team2) teams.add(normalizeHistoryTeamName(match.team2));
  }
  return [...teams].sort((a, b) => a.localeCompare(b));
}

export function HistoryContentToolbar({
  tab,
  matches,
  searchQuery,
  country,
  countries,
  year,
  selectedYear,
  yearOptions,
  yearTabOptions,
  round,
  rounds,
  chartContinent,
  chartTeam,
  onSearchChange,
  onUpdate,
  onChartContinentChange,
  onChartTeamChange,
}: {
  tab: HistoryTab;
  matches: HistoryMatch[];
  searchQuery: string;
  country: string;
  countries: string[];
  year: number | undefined;
  selectedYear: number;
  yearOptions: { value: string; label: string }[];
  yearTabOptions: { value: string; label: string }[];
  round: string | undefined;
  rounds: string[];
  chartContinent: string;
  chartTeam: string;
  onSearchChange: (value: string) => void;
  onUpdate: (updates: Record<string, string | undefined>) => void;
  onChartContinentChange: (value: string) => void;
  onChartTeamChange: (value: string) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  const allTeams = useMemo(() => collectTeams(matches), [matches]);
  const continents = useMemo(() => {
    const values = new Set<string>();
    for (const team of allTeams) {
      const continent = getHistoryTeamContinent(team);
      if (continent) values.add(continent);
    }
    return HISTORY_CONTINENTS.filter((continent) => values.has(continent));
  }, [allTeams]);

  const activeCount =
    (searchQuery ? 1 : 0) +
    (country ? 1 : 0) +
    (tab === "all" && year ? 1 : 0) +
    (tab === "year" && year ? 1 : 0) +
    (round ? 1 : 0) +
    (chartContinent ? 1 : 0) +
    (chartTeam ? 1 : 0);

  useEffect(() => {
    if (!filtersOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!filtersRef.current?.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [filtersOpen]);

  const clearFilters = () => {
    onSearchChange("");
    onChartContinentChange("");
    onChartTeamChange("");
    onUpdate({
      q: undefined,
      year: undefined,
      round: undefined,
    });
  };

  return (
    <div className="history-content-toolbar">
      <SearchInput
        id="history-search"
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search team name…"
      />
      <div className="history-chart-filter-wrap" ref={filtersRef}>
        <button
          type="button"
          className={`page-toolbar-btn page-toolbar-btn--filter ${
            filtersOpen ? "is-open" : ""
          } ${activeCount > 0 ? "has-selection" : ""}`}
          onClick={() => setFiltersOpen((open) => !open)}
          aria-label={activeCount > 0 ? `Filters (${activeCount} active)` : "Open filters"}
          aria-pressed={filtersOpen}
          aria-expanded={filtersOpen}
        >
          <FilterIcon />
          {activeCount > 0 && (
            <span className="page-toolbar-btn-dot" aria-hidden="true" />
          )}
        </button>
        {filtersOpen && (
          <div className="history-chart-filters" role="dialog" aria-label="History filters">
            <FilterSection title="Country" layout="field">
              <FilterSelect
                id="history-country"
                value={country}
                options={[
                  { value: "", label: "All countries" },
                  ...countries.map((name) => ({ value: name, label: name })),
                ]}
                onChange={(value) => onUpdate({ q: value || undefined })}
              />
            </FilterSection>
            <FilterSection title="Year" layout="field">
              <FilterSelect
                id="history-year"
                value={tab === "year" ? String(selectedYear) : year ? String(year) : ""}
                options={tab === "year" ? yearTabOptions : yearOptions}
                onChange={(value) =>
                  onUpdate({
                    tab: tab === "year" ? "year" : undefined,
                    year: value || undefined,
                    round: undefined,
                  })
                }
              />
            </FilterSection>
            <FilterSection title="Round" layout="field">
              <FilterSelect
                id="history-round"
                value={round ?? ""}
                options={[
                  { value: "", label: "All rounds" },
                  ...rounds.map((r) => ({ value: r, label: r })),
                ]}
                onChange={(value) => onUpdate({ round: value || undefined })}
              />
            </FilterSection>
            <FilterSection title="Continent" layout="field">
              <FilterSelect
                id="history-continent"
                value={chartContinent}
                options={[
                  { value: "", label: "All continents" },
                  ...continents.map((continent) => ({
                    value: continent,
                    label: continent,
                  })),
                ]}
                onChange={onChartContinentChange}
              />
            </FilterSection>
            <FilterSection title="Team" layout="field">
              <FilterSelect
                id="history-team"
                value={chartTeam}
                options={[
                  { value: "", label: "All teams" },
                  ...allTeams.map((team) => ({ value: team, label: team })),
                ]}
                onChange={onChartTeamChange}
              />
            </FilterSection>
            {activeCount > 0 && (
              <button
                type="button"
                className="btn-secondary history-chart-filters-clear"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

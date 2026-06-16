import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type WorldRankingEntry } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { PageToolbar } from "../components/PageToolbar";
import { SearchInput } from "../components/SearchInput";
import { ViewModeToggle, type ViewMode } from "../components/ViewModeToggle";
import {
  WorldRankingCard,
  WorldRankingRow,
} from "../components/WorldRankingEntry";
import { updateSearchParams } from "../utils/navigation";

const DEFAULT_VIEW_MODE: ViewMode = "list";

function matchesRankingSearch(entry: WorldRankingEntry, query: string) {
  const normalized = query.toLowerCase();
  return (
    entry.name.toLowerCase().includes(normalized) ||
    entry.fifa_code.toLowerCase().includes(normalized) ||
    entry.confederation.toLowerCase().includes(normalized) ||
    (entry.group ?? "").toLowerCase().includes(normalized)
  );
}

function formatAsOfDate(asOf: string) {
  const parsed = new Date(`${asOf}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return asOf;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function WorldRankings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const viewMode: ViewMode =
    viewParam === "list" ? "list" : viewParam === "grid" ? "grid" : DEFAULT_VIEW_MODE;
  const searchQuery = searchParams.get("q") || "";

  const [rankings, setRankings] = useState<WorldRankingEntry[]>([]);
  const [asOf, setAsOf] = useState("2026-06-11");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getWorldRankings()
      .then((response) => {
        setRankings(response.rankings);
        setAsOf(response.as_of);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const qualifiedCount = useMemo(
    () => rankings.filter((entry) => entry.qualified).length,
    [rankings]
  );

  const filteredRankings = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return rankings;
    return rankings.filter((entry) => matchesRankingSearch(entry, normalized));
  }, [rankings, searchQuery]);

  const updateParams = (updates: Record<string, string | undefined>) => {
    updateSearchParams(searchParams, setSearchParams, updates);
  };

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading FIFA world rankings…</div>;

  const containerClass = viewMode === "list" ? "team-list" : "team-grid";

  return (
    <>
      <PageHeader
        title="FIFA World Rankings"
        accent="var(--palette-navy)"
        subtitle={
          searchQuery.trim()
            ? `${filteredRankings.length} nations found · as of ${formatAsOfDate(asOf)}`
            : `${rankings.length} ranked nations · ${qualifiedCount} at World Cup 2026 · as of ${formatAsOfDate(asOf)}`
        }
      >
        <PageToolbar
          search={
            <SearchInput
              id="world-rankings-search"
              value={searchQuery}
              onChange={(value) => updateParams({ q: value.trim() || undefined })}
              placeholder="Search…"
            />
          }
          actions={
            <ViewModeToggle
              value={viewMode}
              onToggle={() => {
                const next = viewMode === "grid" ? "list" : "grid";
                updateParams({ view: next === DEFAULT_VIEW_MODE ? undefined : next });
              }}
            />
          }
        />
      </PageHeader>

      {filteredRankings.length === 0 ? (
        <p className="empty-state">
          {searchQuery.trim()
            ? `No nations match "${searchQuery.trim()}".`
            : "No rankings found."}
        </p>
      ) : (
        <div className={containerClass}>
          {filteredRankings.map((entry, index) => (
            <div key={entry.fifa_code}>
              {viewMode === "list" ? (
                <WorldRankingRow entry={entry} />
              ) : (
                <WorldRankingCard entry={entry} />
              )}
              {(index + 1) % 8 === 0 && <AdBanner />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

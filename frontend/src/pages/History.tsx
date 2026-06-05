import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type HistoryMatch, type HistoryTournament } from "../api/client";
import { HistoryMatchCard } from "../components/HistoryMatchCard";
import { HistoryRoundChart } from "../components/HistoryRoundChart";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { TeamTreemap } from "../components/TeamTreemap";
import { FilterOption, FilterSection, FilterSelect } from "../components/FilterPanel";
import { PageHeader } from "../components/PageHeader";
import { usePageFilters } from "../context/FilterPanelContext";

type HistoryTab = "all" | "year";

type YearGroup = {
  year: number;
  matches: HistoryMatch[];
};

export function History() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") === "year" ? "year" : "all") as HistoryTab;
  const yearParam = searchParams.get("year");
  const round = searchParams.get("round") || undefined;
  const year = yearParam ? Number(yearParam) : undefined;

  const [tournaments, setTournaments] = useState<HistoryTournament[]>([]);
  const [matches, setMatches] = useState<HistoryMatch[]>([]);
  const [yearMatches, setYearMatches] = useState<HistoryMatch[]>([]);
  const [chartMatches, setChartMatches] = useState<HistoryMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearLoading, setYearLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedYear = year ?? tournaments[tournaments.length - 1]?.year ?? 2022;

  useEffect(() => {
    api
      .getHistoryMatches()
      .then((res) => setChartMatches(res.matches))
      .catch(() => setChartMatches([]));
  }, []);

  useEffect(() => {
    api
      .getHistoryTournaments()
      .then((res) => setTournaments(res.tournaments))
      .catch(() => setTournaments([]));
  }, []);

  useEffect(() => {
    if (tab !== "all") return;
    setLoading(true);
    api
      .getHistoryMatches({ year, round })
      .then((matchesRes) => setMatches(matchesRes.matches))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, year, round]);

  useEffect(() => {
    if (tab !== "year") return;
    setYearLoading(true);
    api
      .getHistoryMatches({ year: selectedYear })
      .then((matchesRes) => setYearMatches(matchesRes.matches))
      .catch((e) => setError(e.message))
      .finally(() => setYearLoading(false));
  }, [tab, selectedYear]);

  const rounds = useMemo(
    () => [...new Set(matches.map((m) => m.round).filter(Boolean))].sort(),
    [matches]
  );

  const yearGroups = useMemo(() => {
    const groups = new Map<number, HistoryMatch[]>();
    for (const match of matches) {
      const existing = groups.get(match.year) ?? [];
      existing.push(match);
      groups.set(match.year, existing);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => b - a)
      .map(([groupYear, groupMatches]) => ({
        year: groupYear,
        matches: groupMatches,
      })) satisfies YearGroup[];
  }, [matches]);

  const activeCount = tab === "all" ? (year ? 1 : 0) + (round ? 1 : 0) : 0;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  };

  const setTab = (nextTab: HistoryTab) => {
    if (nextTab === "year") {
      updateParams({
        tab: "year",
        year: String(selectedYear),
        round: undefined,
      });
      return;
    }
    updateParams({ tab: undefined, round: undefined });
  };

  if (error) return <div className="error">Failed to load: {error}</div>;

  let adCounter = 0;

  return (
    <>
      <PageHeader title="World Cup History">
        <SegmentedTabs
          ariaLabel="History view"
          tabs={[
            { id: "all", label: "All" },
            { id: "year", label: "Year" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </PageHeader>

      {tab === "all" ? (
        loading ? (
          <div className="loading">Loading history…</div>
        ) : (
          <>
            <HistoryAllFilters
              year={year}
              round={round}
              tournaments={tournaments}
              rounds={rounds}
              activeCount={activeCount}
              onUpdate={updateParams}
            />
            <p className="page-subtitle">
              {matches.length} matches across {year ? 1 : tournaments.length} tournaments
            </p>
            <HistoryRoundChart matches={chartMatches} />
            {yearGroups.map((group) => (
              <section key={group.year} className="history-year-section">
                {!year && <h2 className="history-year-heading">{group.year}</h2>}
                {group.matches.map((match) => {
                  adCounter += 1;
                  return (
                    <div key={`${match.year}-${match.date}-${match.team1}-${match.team2}`}>
                      <HistoryMatchCard match={match} />
                      {adCounter % 8 === 0 && <AdBanner />}
                    </div>
                  );
                })}
              </section>
            ))}
          </>
        )
      ) : yearLoading ? (
        <div className="loading">Loading {selectedYear}…</div>
      ) : (
        <>
          <div className="history-year-picker">
            <span className="filter-section-title">Year</span>
            <FilterSelect
              id="history-year-select"
              value={String(selectedYear)}
              options={[...tournaments].reverse().map((t) => ({
                value: String(t.year),
                label: `${t.year} · ${t.match_count} matches`,
              }))}
              onChange={(value) =>
                updateParams({ tab: "year", year: value, round: undefined })
              }
            />
          </div>
          <TeamTreemap year={selectedYear} matches={yearMatches} />
          <section className="history-year-section">
            <h2 className="history-year-heading">{selectedYear} Matches</h2>
            {yearMatches.map((match) => {
              adCounter += 1;
              return (
                <div key={`${match.year}-${match.date}-${match.team1}-${match.team2}`}>
                  <HistoryMatchCard match={match} />
                  {adCounter % 8 === 0 && <AdBanner />}
                </div>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}

function HistoryAllFilters({
  year,
  round,
  tournaments,
  rounds,
  activeCount,
  onUpdate,
}: {
  year: number | undefined;
  round: string | undefined;
  tournaments: HistoryTournament[];
  rounds: string[];
  activeCount: number;
  onUpdate: (updates: Record<string, string | undefined>) => void;
}) {
  const filterContent = useMemo(
    () => (
      <>
        <FilterSection title="Year" layout="field">
          <FilterSelect
            id="history-year"
            value={year ? String(year) : ""}
            options={[
              { value: "", label: "All tournaments" },
              ...[...tournaments].reverse().map((t) => ({
                value: String(t.year),
                label: `${t.year} (${t.match_count} matches)`,
              })),
            ]}
            onChange={(value) => onUpdate({ year: value || undefined, round: undefined })}
          />
        </FilterSection>
        {rounds.length > 0 && (
          <FilterSection title="Round">
            <FilterOption
              label="All rounds"
              active={!round}
              onClick={() => onUpdate({ round: undefined })}
            />
            {rounds.map((r) => (
              <FilterOption
                key={r}
                label={r}
                active={round === r}
                onClick={() => onUpdate({ round: r })}
              />
            ))}
          </FilterSection>
        )}
      </>
    ),
    [year, round, tournaments, rounds, onUpdate]
  );

  usePageFilters({
    title: "History Filters",
    content: filterContent,
    activeCount,
  });

  return null;
}

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match } from "../api/client";
import { DatePicker } from "../components/DatePicker";
import { MatchCard } from "../components/MatchCard";
import { FilterOption, FilterSection, FilterSelect } from "../components/FilterPanel";
import { PageHeader } from "../components/PageHeader";
import { usePageFilters } from "../context/FilterPanelContext";

export function Matches() {
  const [searchParams, setSearchParams] = useSearchParams();
  const group = searchParams.get("group") || undefined;
  const round = searchParams.get("round") || undefined;
  const dateParam = searchParams.get("date") || undefined;
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getMatches(group), api.getStats()])
      .then(([matchesRes, stats]) => {
        setMatches(matchesRes.matches);
        setGroups(stats.groups);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [group]);

  const rounds = useMemo(
    () => [...new Set(matches.map((m) => m.round).filter(Boolean))].sort(),
    [matches]
  );

  const roundFilteredMatches = useMemo(
    () => (round ? matches.filter((m) => m.round === round) : matches),
    [matches, round]
  );

  const availableDates = useMemo(
    () =>
      [...new Set(roundFilteredMatches.map((m) => m.date).filter(Boolean))].sort() as string[],
    [roundFilteredMatches]
  );

  const minDate = availableDates[0];
  const maxDate = availableDates[availableDates.length - 1];

  const selectedDate = useMemo(() => {
    const initial = dateParam ?? availableDates[0];
    if (!initial) return undefined;
    if (minDate && initial < minDate) return minDate;
    if (maxDate && initial > maxDate) return maxDate;
    return initial;
  }, [dateParam, availableDates, minDate, maxDate]);

  const filteredMatches = useMemo(
    () =>
      selectedDate
        ? roundFilteredMatches.filter((m) => m.date === selectedDate)
        : roundFilteredMatches,
    [roundFilteredMatches, selectedDate]
  );

  const activeCount = (group ? 1 : 0) + (round ? 1 : 0);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  };

  const filterContent = useMemo(
    () => (
      <>
        <FilterSection title="Group" layout="field">
          <FilterSelect
            id="matches-group"
            value={group ?? ""}
            options={[
              { value: "", label: "All groups" },
              ...groups.map((g) => ({ value: g, label: g })),
            ]}
            onChange={(value) =>
              updateParams({ group: value || undefined, round: undefined })
            }
          />
        </FilterSection>
        {rounds.length > 0 && (
          <FilterSection title="Round">
            <FilterOption
              label="All rounds"
              active={!round}
              onClick={() => updateParams({ round: undefined })}
            />
            {rounds.map((r) => (
              <FilterOption
                key={r}
                label={r}
                active={round === r}
                onClick={() => updateParams({ round: r })}
              />
            ))}
          </FilterSection>
        )}
      </>
    ),
    [group, round, groups, rounds, searchParams]
  );

  usePageFilters({
    title: "Match Filters",
    content: filterContent,
    activeCount,
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading matches…</div>;

  return (
    <>
      <PageHeader title="Matches">
        {selectedDate && (
          <DatePicker
            value={selectedDate}
            min={minDate}
            max={maxDate}
            onChange={(date) => updateParams({ date })}
          />
        )}
        <p className="page-subtitle">{filteredMatches.length} fixtures</p>
      </PageHeader>
      {filteredMatches.length === 0 ? (
        <p className="empty-state">No matches on this day.</p>
      ) : (
        filteredMatches.map((match, i) => (
          <div key={match.id}>
            <MatchCard match={match} />
            {(i + 1) % 6 === 0 && <AdBanner />}
          </div>
        ))
      )}
    </>
  );
}

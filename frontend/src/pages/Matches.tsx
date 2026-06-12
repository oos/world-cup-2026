import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { FilterOption, FilterSection, FilterSelect } from "../components/FilterPanel";
import { PageHeader } from "../components/PageHeader";
import { usePageFilters } from "../context/FilterPanelContext";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import {
  formatResolvedTimezoneLabel,
  resolveUserTimezone,
} from "../utils/cityTimezones";
import {
  formatDateHeading,
  getMatchLocalDate,
  getMatchSortKey,
  getScrollTargetDate,
  getTodayLocalDate,
} from "../utils/matchTime";

export function Matches() {
  const { preferences } = useProfilePreferences();
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const timezoneLabel = formatResolvedTimezoneLabel(
    preferences.city,
    preferences.timezone,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const group = searchParams.get("group") || undefined;
  const round = searchParams.get("round") || undefined;
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasScrolledRef = useRef(false);

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

  const todayLocal = getTodayLocalDate(timeZone);

  const matchesByDate = useMemo(() => {
    const sorted = [...roundFilteredMatches].sort(
      (a, b) => getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time)
    );

    const groups = new Map<string, Match[]>();
    for (const match of sorted) {
      const localDate = getMatchLocalDate(match.date, match.time, timeZone);
      if (!localDate) continue;
      const dayMatches = groups.get(localDate) ?? [];
      dayMatches.push(match);
      groups.set(localDate, dayMatches);
    }

    return [...groups.entries()];
  }, [roundFilteredMatches, timeZone]);

  const scrollTargetDate = useMemo(
    () => getScrollTargetDate(matchesByDate.map(([date]) => date), todayLocal),
    [matchesByDate, todayLocal]
  );

  const scrollKey = `${scrollTargetDate ?? "none"}-${group ?? ""}-${round ?? ""}-${timeZone}`;

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [scrollKey]);

  useEffect(() => {
    if (loading || !scrollTargetDate || hasScrolledRef.current) return;

    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`matches-date-${scrollTargetDate}`)
        ?.scrollIntoView({ block: "start" });
      hasScrolledRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [loading, scrollTargetDate, scrollKey]);

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

  let matchIndex = 0;

  return (
    <>
      <PageHeader title="Matches">
        <p className="matches-timezone">
          Times in {timezoneLabel}
          {" · "}
          <Link to="/profile#profile-location" className="matches-timezone-link">
            Change
          </Link>
        </p>
        <p className="page-subtitle">{roundFilteredMatches.length} fixtures</p>
      </PageHeader>
      {matchesByDate.length === 0 ? (
        <p className="empty-state">No matches match your filters.</p>
      ) : (
        <div className="matches-schedule">
          {matchesByDate.map(([date, dayMatches]) => (
            <section key={date} className="matches-date-section">
              <h2
                id={`matches-date-${date}`}
                className={`matches-date-heading${date === todayLocal ? " is-today" : ""}`}
              >
                {formatDateHeading(date, todayLocal)}
              </h2>
              {dayMatches.map((match) => {
                matchIndex += 1;
                return (
                  <div key={match.id}>
                    <MatchCard match={match} showDate={false} showGroupAccent />
                    {matchIndex % 6 === 0 && <AdBanner />}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Settings, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import {
  api,
  type HistoryMatch,
  type HistoryTournament,
  type Match,
} from "../api/client";
import { ActiveFilterBar, type ActiveFilter } from "../components/ActiveFilterBar";
import { HistoryMatchCard } from "../components/HistoryMatchCard";
import { MatchCard } from "../components/MatchCard";
import { FilterMultiSelect, FilterSection, FilterSelect } from "../components/FilterPanel";
import { PageHeader } from "../components/PageHeader";
import { PlayedMatchesToggle } from "../components/PlayedMatchesToggle";
import { SortCycleToggle } from "../components/SortCycleToggle";
import { TimezoneModal } from "../components/TimezoneModal";
import { usePageFilters } from "../context/FilterPanelContext";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import {
  formatResolvedTimezoneLabel,
  resolveUserTimezone,
} from "../utils/cityTimezones";
import { historyMatchKey } from "../utils/historyMatch";
import {
  formatDateHeading,
  getMatchLocalDate,
  getMatchSortKey,
  getTodayLocalDate,
  isMatchPast,
} from "../utils/matchTime";
import {
  compareMatchExcitement,
  parseMatchSortParam,
  type MatchSort,
} from "../utils/matchExcitement";

const CURRENT_YEAR = 2026;

type MatchSortCycle = "date" | "ef";

const MATCH_SORT_OPTIONS: {
  value: MatchSortCycle;
  label: string;
  icon: typeof CalendarDays;
}[] = [
  { value: "date", label: "Date & time", icon: CalendarDays },
  { value: "ef", label: "EF (excitement factor)", icon: Sparkles },
];

type MatchesProps = {
  pageTitle?: string;
  pageSubtitle?: string;
  accent?: string;
};

function buildScheduleByDate<T extends { date: string | null; time: string | null }>(
  matches: T[],
  timeZone: string
): { date: string; matches: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const match of matches) {
    const localDate = getMatchLocalDate(match.date, match.time, timeZone);
    if (!localDate) continue;
    const dayMatches = groups.get(localDate) ?? [];
    dayMatches.push(match);
    groups.set(localDate, dayMatches);
  }

  for (const dayMatches of groups.values()) {
    dayMatches.sort(
      (a, b) => getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time)
    );
  }

  return [...groups.keys()]
    .sort((dateA, dateB) => dateA.localeCompare(dateB))
    .map((date) => ({ date, matches: groups.get(date)! }));
}

export function Matches({
  pageTitle = "Matches",
  pageSubtitle,
  accent,
}: MatchesProps = {}) {
  const { preferences, updatePreferences } = useProfilePreferences();
  const [timezoneModalOpen, setTimezoneModalOpen] = useState(false);
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const timezoneLabel = formatResolvedTimezoneLabel(
    preferences.city,
    preferences.timezone,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const yearParam = searchParams.get("year");
  const year = Number(yearParam ?? CURRENT_YEAR);
  const isCurrentTournament = year === CURRENT_YEAR;
  const group = searchParams.get("group") || undefined;
  const selectedRounds = searchParams.getAll("round").filter(Boolean);
  const sortParam = searchParams.get("sort");
  const sort: MatchSort = isCurrentTournament ? parseMatchSortParam(sortParam) : "date";
  const [matches, setMatches] = useState<Match[]>([]);
  const [historyMatches, setHistoryMatches] = useState<HistoryMatch[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [tournaments, setTournaments] = useState<HistoryTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlayedMatches, setShowPlayedMatches] = useState(false);

  const matchesReturnPath = useMemo(
    () => `/matches${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    [searchParams]
  );

  useEffect(() => {
    if (!searchParams.get("year")) {
      const next = new URLSearchParams(searchParams);
      next.set("year", String(CURRENT_YEAR));
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    setShowPlayedMatches(false);

    if (isCurrentTournament) {
      Promise.all([api.getMatches(group), api.getStats(), api.getHistoryTournaments()])
        .then(([matchesRes, stats, tournamentsRes]) => {
          setMatches(matchesRes.matches);
          setHistoryMatches([]);
          setGroups(stats.groups);
          setTournaments(tournamentsRes.tournaments);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      Promise.all([api.getHistoryMatches({ year, group }), api.getHistoryTournaments()])
        .then(([matchesRes, tournamentsRes]) => {
          setMatches([]);
          setHistoryMatches(matchesRes.matches);
          setGroups(
            [...new Set(matchesRes.matches.map((match) => match.group).filter(Boolean))].sort() as string[]
          );
          setTournaments(tournamentsRes.tournaments);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [year, group, isCurrentTournament]);

  const rounds = useMemo(() => {
    const source = isCurrentTournament ? matches : historyMatches;
    return [...new Set(source.map((match) => match.round).filter(Boolean))].sort();
  }, [matches, historyMatches, isCurrentTournament]);

  const roundFilteredMatches = useMemo(
    () =>
      selectedRounds.length > 0
        ? matches.filter((match) => match.round && selectedRounds.includes(match.round))
        : matches,
    [matches, selectedRounds]
  );

  const roundFilteredHistoryMatches = useMemo(
    () =>
      selectedRounds.length > 0
        ? historyMatches.filter((match) => match.round && selectedRounds.includes(match.round))
        : historyMatches,
    [historyMatches, selectedRounds]
  );

  const playedMatchCount = useMemo(
    () =>
      roundFilteredMatches.filter((match) => isMatchPast(match.date, match.time)).length,
    [roundFilteredMatches]
  );

  const displayMatches = useMemo(
    () =>
      showPlayedMatches
        ? roundFilteredMatches
        : roundFilteredMatches.filter((match) => !isMatchPast(match.date, match.time)),
    [roundFilteredMatches, showPlayedMatches]
  );

  const todayLocal = getTodayLocalDate(timeZone);

  const todayMatchCount = useMemo(
    () =>
      displayMatches.filter(
        (match) => getMatchLocalDate(match.date, match.time, timeZone) === todayLocal
      ).length,
    [displayMatches, timeZone, todayLocal]
  );

  const scheduleSections = useMemo(
    () => buildScheduleByDate(displayMatches, timeZone),
    [displayMatches, timeZone]
  );

  const historyScheduleSections = useMemo(
    () => buildScheduleByDate(roundFilteredHistoryMatches, timeZone),
    [roundFilteredHistoryMatches, timeZone]
  );

  const excitementSortedMatches = useMemo(() => {
    if (!isCurrentTournament || sort !== "excitement") return [];
    return [...displayMatches].sort((a, b) => {
      const excitementDiff = compareMatchExcitement(a, b);
      if (excitementDiff !== 0) return excitementDiff;
      return getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time);
    });
  }, [displayMatches, sort, isCurrentTournament]);

  const currentTournamentMatchCount = useMemo(() => {
    if (isCurrentTournament) return matches.length;
    const tournament = tournaments.find((item) => item.year === CURRENT_YEAR);
    return tournament?.match_count ?? 0;
  }, [isCurrentTournament, matches.length, tournaments]);

  const yearOptions = useMemo(
    () => [
      {
        value: String(CURRENT_YEAR),
        label: `${CURRENT_YEAR} (${currentTournamentMatchCount} matches)`,
      },
      ...[...tournaments]
        .filter((tournament) => tournament.year !== CURRENT_YEAR)
        .sort((a, b) => b.year - a.year)
        .map((tournament) => ({
          value: String(tournament.year),
          label: `${tournament.year} (${tournament.match_count} matches)`,
        })),
    ],
    [tournaments, currentTournamentMatchCount]
  );

  const displayedFixtureCount = isCurrentTournament
    ? displayMatches.length
    : roundFilteredHistoryMatches.length;

  const updateParams = (updates: Record<string, string | string[] | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      next.delete(key);
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          next.append(key, item);
        }
      } else if (value) {
        next.set(key, value);
      }
    }
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    updateParams({
      year: String(CURRENT_YEAR),
      group: undefined,
      round: [],
      sort: undefined,
    });
    setShowPlayedMatches(false);
  };

  const activeFilters = useMemo((): ActiveFilter[] => {
    const filters: ActiveFilter[] = [];

    if (year !== CURRENT_YEAR) {
      filters.push({
        key: "year",
        label: `${year} World Cup`,
        onRemove: () => {
          updateParams({
            year: String(CURRENT_YEAR),
            group: undefined,
            round: [],
            sort: sortParam === "ef" ? undefined : sortParam,
          });
        },
      });
    }

    if (group) {
      filters.push({
        key: "group",
        label: group,
        onRemove: () => updateParams({ group: undefined, round: [] }),
      });
    }

    for (const round of selectedRounds) {
      filters.push({
        key: `round-${round}`,
        label: round,
        onRemove: () =>
          updateParams({
            round: selectedRounds.filter((item) => item !== round),
          }),
      });
    }

    if (isCurrentTournament && sort === "excitement") {
      filters.push({
        key: "sort",
        label: "EF sort",
        onRemove: () => updateParams({ sort: undefined }),
      });
    }

    return filters;
  }, [
    year,
    group,
    selectedRounds,
    sort,
    isCurrentTournament,
    sortParam,
    searchParams,
  ]);

  const activeCount = activeFilters.length;

  const filterContent = useMemo(
    () => (
      <>
        <FilterSection title="World Cup year" layout="field">
          <FilterSelect
            id="matches-year"
            value={String(year)}
            options={yearOptions}
            onChange={(value) => {
              const selectedYear = Number(value);
              updateParams({
                year: value,
                group: undefined,
                round: [],
                sort:
                  selectedYear !== CURRENT_YEAR && sortParam === "ef"
                    ? undefined
                    : sortParam,
              });
            }}
          />
        </FilterSection>
        <FilterSection title="Group" layout="field">
          <FilterSelect
            id="matches-group"
            value={group ?? ""}
            options={[
              { value: "", label: "All groups" },
              ...groups.map((g) => ({ value: g, label: g })),
            ]}
            onChange={(value) =>
              updateParams({ group: value || undefined, round: [] })
            }
          />
        </FilterSection>
        {rounds.length > 0 && (
          <FilterSection title="Round" layout="field">
            <FilterMultiSelect
              id="matches-round"
              values={selectedRounds}
              placeholder="All rounds"
              options={rounds.map((roundName) => ({
                value: roundName,
                label: roundName,
              }))}
              onChange={(values) => updateParams({ round: values })}
            />
          </FilterSection>
        )}
        {activeFilters.length > 0 && (
          <button
            type="button"
            className="btn-secondary active-filter-panel-clear"
            onClick={clearAllFilters}
          >
            Clear all filters
          </button>
        )}
      </>
    ),
    [year, yearOptions, group, selectedRounds, groups, rounds, sortParam, activeFilters.length, searchParams]
  );

  const sortCycleValue: MatchSortCycle = sort === "excitement" ? "ef" : "date";
  const sortOptions = MATCH_SORT_OPTIONS;

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
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        accent={accent}
        toolbar={
          <PageToolbar
            actions={
              isCurrentTournament ? (
                <SortCycleToggle
                  value={sortCycleValue}
                  options={sortOptions}
                  defaultValue="date"
                  onChange={(next) =>
                    updateParams({ sort: next === "date" ? undefined : next })
                  }
                />
              ) : undefined
            }
          />
        }
      >
        <div className="dashboard-section-subtitle-row">
          <p className="dashboard-section-subtitle">
            {displayedFixtureCount} fixtures
            {isCurrentTournament ? ` · ${todayMatchCount} today` : ""}
          </p>
          <div className="dashboard-section-subtitle-extra">
            <span className="dashboard-upcoming-timezone">{timezoneLabel}</span>
            <button
              type="button"
              className="profile-settings-btn"
              aria-label="Change timezone"
              onClick={() => setTimezoneModalOpen(true)}
            >
              <Settings size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        </div>
      </PageHeader>
      <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />
      {isCurrentTournament && (
        <PlayedMatchesToggle
          expanded={showPlayedMatches}
          playedCount={playedMatchCount}
          onToggle={() => setShowPlayedMatches((current) => !current)}
        />
      )}
      {isCurrentTournament ? (
        sort === "excitement" ? (
          excitementSortedMatches.length === 0 ? (
            <p className="empty-state">
              {playedMatchCount > 0 && !showPlayedMatches
                ? "No upcoming matches. Show matches already played to see recent results."
                : "No matches match your filters."}
            </p>
          ) : (
            <div className="matches-schedule">
              {excitementSortedMatches.map((match) => {
                matchIndex += 1;
                return (
                  <div key={match.id}>
                    <MatchCard match={match} showGroupAccent />
                    {matchIndex % 6 === 0 && <AdBanner />}
                  </div>
                );
              })}
            </div>
          )
        ) : scheduleSections.length === 0 ? (
          <p className="empty-state">
            {playedMatchCount > 0 && !showPlayedMatches
              ? "No upcoming matches. Show matches already played to see recent results."
              : "No matches match your filters."}
          </p>
        ) : (
          <div className="matches-schedule">
            {scheduleSections.map(({ date, matches: dayMatches }) => (
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
        )
      ) : historyScheduleSections.length === 0 ? (
        <p className="empty-state">No matches match your filters.</p>
      ) : (
        <div className="matches-schedule">
          {historyScheduleSections.map(({ date, matches: dayMatches }) => (
            <section key={date} className="matches-date-section">
              <h2 id={`matches-date-${date}`} className="matches-date-heading">
                {formatDateHeading(date, todayLocal)}
              </h2>
              {dayMatches.map((match) => {
                matchIndex += 1;
                const key = `${match.year}-${historyMatchKey(match)}`;
                return (
                  <div key={key}>
                    <HistoryMatchCard match={match} returnTo={matchesReturnPath} />
                    {matchIndex % 6 === 0 && <AdBanner />}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
      <TimezoneModal
        open={timezoneModalOpen}
        onClose={() => setTimezoneModalOpen(false)}
        city={preferences.city}
        timezone={preferences.timezone}
        onSave={(timezone) => updatePreferences({ timezone })}
      />
    </>
  );
}

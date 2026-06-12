import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Settings, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { FilterMultiSelect, FilterSection, FilterSelect } from "../components/FilterPanel";
import { PageHeader } from "../components/PageHeader";
import { PageToolbar } from "../components/PageToolbar";
import { SortCycleToggle } from "../components/SortCycleToggle";
import { TimezoneModal } from "../components/TimezoneModal";
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
  isMatchPast,
} from "../utils/matchTime";
import {
  compareMatchExcitement,
  parseMatchSortParam,
  type MatchSort,
} from "../utils/matchExcitement";

type MatchScheduleItem =
  | { kind: "heading"; date: string }
  | { kind: "match"; match: Match };

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
  const group = searchParams.get("group") || undefined;
  const selectedRounds = searchParams.getAll("round").filter(Boolean);
  const sortParam = searchParams.get("sort");
  const sort: MatchSort = parseMatchSortParam(sortParam);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlayedMatches, setShowPlayedMatches] = useState(false);
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
    () =>
      selectedRounds.length > 0
        ? matches.filter((match) => match.round && selectedRounds.includes(match.round))
        : matches,
    [matches, selectedRounds]
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

  const scheduleItems = useMemo((): MatchScheduleItem[] => {
    const groups = new Map<string, Match[]>();
    for (const match of displayMatches) {
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

    const dates = [...groups.keys()].sort((dateA, dateB) => dateA.localeCompare(dateB));
    return dates.flatMap((date) => [
      { kind: "heading" as const, date },
      ...groups.get(date)!.map((match) => ({ kind: "match" as const, match })),
    ]);
  }, [displayMatches, timeZone]);

  const excitementSortedMatches = useMemo(() => {
    if (sort !== "excitement") return [];
    return [...displayMatches].sort((a, b) => {
      const excitementDiff = compareMatchExcitement(a, b);
      if (excitementDiff !== 0) return excitementDiff;
      return getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time);
    });
  }, [displayMatches, sort]);

  const scheduleSections = useMemo(() => {
    const sections: { date: string; matches: Match[] }[] = [];
    for (const item of scheduleItems) {
      if (item.kind === "heading") {
        sections.push({ date: item.date, matches: [] });
      } else if (sections.length > 0) {
        sections[sections.length - 1].matches.push(item.match);
      }
    }
    return sections;
  }, [scheduleItems]);

  const scheduleDates = useMemo(
    () => scheduleSections.map((section) => section.date),
    [scheduleSections]
  );

  const scrollTargetDate = useMemo(
    () => getScrollTargetDate(scheduleDates, todayLocal),
    [scheduleDates, todayLocal]
  );

  const scrollKey = `${scrollTargetDate ?? "none"}-${group ?? ""}-${selectedRounds.join(",")}-${sort}-${showPlayedMatches}-${timeZone}`;

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [scrollKey]);

  useEffect(() => {
    if (loading || !scrollTargetDate || hasScrolledRef.current || sort !== "date") return;

    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`matches-date-${scrollTargetDate}`)
        ?.scrollIntoView({ block: "start" });
      hasScrolledRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [loading, scrollTargetDate, scrollKey]);

  const activeCount = (group ? 1 : 0) + (selectedRounds.length > 0 ? 1 : 0);

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
      </>
    ),
    [group, selectedRounds, groups, rounds, searchParams]
  );

  const sortCycleValue: MatchSortCycle = sort === "excitement" ? "ef" : "date";

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
              <SortCycleToggle
                value={sortCycleValue}
                options={MATCH_SORT_OPTIONS}
                defaultValue="date"
                onChange={(next) =>
                  updateParams({ sort: next === "date" ? undefined : next })
                }
              />
            }
          />
        }
      >
        <div className="dashboard-section-subtitle-row">
          <p className="dashboard-section-subtitle">
            {displayMatches.length} fixtures · {todayMatchCount} today
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
      {playedMatchCount > 0 && (
        <button
          type="button"
          className="matches-played-toggle"
          onClick={() => setShowPlayedMatches((current) => !current)}
        >
          {showPlayedMatches
            ? "Hide matches already played"
            : `Show matches already played (${playedMatchCount})`}
        </button>
      )}
      {sort === "excitement" ? (
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

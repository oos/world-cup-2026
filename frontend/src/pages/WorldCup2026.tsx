import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, LayoutGrid, Settings, UserRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match, type Stats, type Team } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { WorldCup2026Chart } from "../components/WorldCup2026Chart";
import {
  FilterMultiSelect,
  FilterSection,
  FilterSelect,
  FilterToggle,
} from "../components/FilterPanel";
import { PageHeader } from "../components/PageHeader";
import { TimezoneModal } from "../components/TimezoneModal";
import { usePageFilters } from "../context/FilterPanelContext";
import { WC_2026_PATH } from "../config/appNav";
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

const TOURNAMENT_YEAR = 2026;
const UPCOMING_INITIAL_DAYS = 2;

export function WorldCup2026() {
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleDayCount, setVisibleDayCount] = useState(UPCOMING_INITIAL_DAYS);
  const loadMoreDaysRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getStats(),
      api.getTeams(),
      api.getMatches(),
      group ? api.getMatches(group) : Promise.resolve(null),
    ])
      .then(([statsRes, allTeamsRes, allMatchesRes, filteredMatchesRes]) => {
        setStats(statsRes);
        setTeams(allTeamsRes.teams);
        setAllMatches(allMatchesRes.matches);
        setMatches(
          filteredMatchesRes ? filteredMatchesRes.matches : allMatchesRes.matches
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [group]);

  const todayLocal = getTodayLocalDate(timeZone);

  const rounds = useMemo(
    () => [...new Set(matches.map((match) => match.round).filter(Boolean))].sort(),
    [matches]
  );

  const roundFilteredMatches = useMemo(
    () =>
      selectedRounds.length > 0
        ? matches.filter(
            (match) => match.round && selectedRounds.includes(match.round)
          )
        : matches,
    [matches, selectedRounds]
  );

  const upcomingMatches = useMemo(
    () =>
      roundFilteredMatches
        .filter((match) => {
          const localDate = getMatchLocalDate(match.date, match.time, timeZone);
          if (localDate === todayLocal) return true;
          return !isMatchPast(match.date, match.time);
        })
        .sort(
          (a, b) =>
            getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time)
        ),
    [roundFilteredMatches, timeZone, todayLocal]
  );

  const upcomingByDate = useMemo(() => {
    const groups = new Map<string, Match[]>();
    for (const match of upcomingMatches) {
      const localDate = getMatchLocalDate(match.date, match.time, timeZone);
      if (!localDate) continue;
      const dayMatches = groups.get(localDate) ?? [];
      dayMatches.push(match);
      groups.set(localDate, dayMatches);
    }
    return [...groups.entries()];
  }, [upcomingMatches, timeZone]);

  const filteredTodayMatchCount = useMemo(
    () =>
      upcomingMatches.filter(
        (match) => getMatchLocalDate(match.date, match.time, timeZone) === todayLocal
      ).length,
    [upcomingMatches, timeZone, todayLocal]
  );

  const scheduleDates = useMemo(
    () => upcomingByDate.map(([date]) => date),
    [upcomingByDate]
  );

  const scrollTargetDate = useMemo(
    () => getScrollTargetDate(scheduleDates, todayLocal),
    [scheduleDates, todayLocal]
  );

  const scrollKey = `${scrollTargetDate ?? "none"}-${group ?? ""}-${selectedRounds.join(",")}-${timeZone}`;

  useEffect(() => {
    setVisibleDayCount(Math.min(UPCOMING_INITIAL_DAYS, upcomingByDate.length));
  }, [upcomingByDate]);

  const visibleUpcomingByDate = useMemo(
    () => upcomingByDate.slice(0, visibleDayCount),
    [upcomingByDate, visibleDayCount]
  );

  const hasMoreUpcomingDays = visibleDayCount < upcomingByDate.length;

  useEffect(() => {
    const sentinel = loadMoreDaysRef.current;
    if (!sentinel || !hasMoreUpcomingDays) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleDayCount((count) =>
          Math.min(count + 1, upcomingByDate.length)
        );
      },
      { rootMargin: "0px 0px 160px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreUpcomingDays, upcomingByDate.length, visibleDayCount]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [scrollKey]);

  useEffect(() => {
    if (loading || !scrollTargetDate || hasScrolledRef.current) return;

    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`wc26-matches-date-${scrollTargetDate}`)
        ?.scrollIntoView({ block: "start" });
      hasScrolledRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [loading, scrollTargetDate, scrollKey]);

  const activeCount = (group ? 1 : 0) + (selectedRounds.length > 0 ? 1 : 0);

  const updateParams = (
    updates: Record<string, string | string[] | undefined>
  ) => {
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
            id="wc26-group"
            value={group ?? ""}
            options={[
              { value: "", label: "All groups" },
              ...(stats?.groups ?? []).map((g) => ({ value: g, label: g })),
            ]}
            onChange={(value) =>
              updateParams({ group: value || undefined, round: [] })
            }
          />
        </FilterSection>
        {rounds.length > 0 && (
          <FilterSection title="Round" layout="field">
            <FilterMultiSelect
              id="wc26-round"
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
    [group, selectedRounds, stats?.groups, rounds, searchParams]
  );

  usePageFilters({
    title: "2026 Filters",
    content: filterContent,
    activeCount,
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading || !stats) return <div className="loading">Loading World Cup 2026…</div>;

  return (
    <>
      <PageHeader
        title={`${TOURNAMENT_YEAR} World Cup`}
        subtitle={`${stats.team_count} teams · ${matches.length} fixtures · ${stats.player_count} players`}
      />

      <div className="stats-row stats-row--compact">
        <Link
          to={`${WC_2026_PATH}?group=Group%20A`}
          className="stat-chip stat-chip-link stat-chip--with-icon"
        >
          <span className="stat-chip-icon stat-chip-icon--groups" aria-hidden="true">
            <LayoutGrid size={20} strokeWidth={2.25} />
          </span>
          <div className="value">{stats.groups.length}</div>
          <div className="label">Groups</div>
        </Link>
        <Link to="/teams" className="stat-chip stat-chip-link stat-chip--with-icon">
          <span className="stat-chip-icon stat-chip-icon--teams" aria-hidden="true">
            <Flag size={20} strokeWidth={2.25} />
          </span>
          <div className="value">{stats.team_count}</div>
          <div className="label">Teams</div>
        </Link>
        <Link to="/players" className="stat-chip stat-chip-link stat-chip--with-icon">
          <span className="stat-chip-icon stat-chip-icon--players" aria-hidden="true">
            <UserRound size={20} strokeWidth={2.25} />
          </span>
          <div className="value">{stats.player_count}</div>
          <div className="label">Players</div>
        </Link>
      </div>

      <section className="dashboard-section dashboard-section--static" id="wc26-matches">
        <div className="dashboard-section-header">
          <div className="dashboard-section-heading">
            <h2 className="dashboard-section-title">Matches</h2>
            <p className="dashboard-section-subtitle">
              {roundFilteredMatches.length} fixtures · {upcomingMatches.length} upcoming ·{" "}
              {filteredTodayMatchCount} today
            </p>
          </div>
        </div>

        <div className="dashboard-section-body">
          <div className="dashboard-matches-toolbar">
            <h3 className="dashboard-matches-subtitle">Upcoming Matches</h3>
            <div className="dashboard-matches-toolbar-controls">
              <span className="dashboard-upcoming-timezone">{timezoneLabel}</span>
              <button
                type="button"
                className="profile-settings-btn"
                aria-label="Change timezone"
                onClick={() => setTimezoneModalOpen(true)}
              >
                <Settings size={16} strokeWidth={2.25} aria-hidden="true" />
              </button>
              <FilterToggle />
            </div>
          </div>

          {upcomingByDate.length === 0 ? (
            <p className="empty-state dashboard-matches-empty">
              No upcoming matches match your filters.
            </p>
          ) : (
            <div className="dashboard-upcoming-schedule">
              {visibleUpcomingByDate.map(([date, dayMatches]) => (
                <div key={date} className="dashboard-upcoming-day">
                  <h3
                    id={`wc26-matches-date-${date}`}
                    className={`matches-date-heading${date === todayLocal ? " is-today" : ""}`}
                  >
                    {formatDateHeading(date, todayLocal)}
                  </h3>
                  <div className="home-match-list">
                    {dayMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        showDate={false}
                        showGroupAccent
                      />
                    ))}
                  </div>
                </div>
              ))}
              {hasMoreUpcomingDays && (
                <div
                  ref={loadMoreDaysRef}
                  className="dashboard-upcoming-sentinel"
                  aria-hidden="true"
                />
              )}
            </div>
          )}
        </div>
      </section>

      <WorldCup2026Chart matches={allMatches} teams={teams} />

      <AdBanner />

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

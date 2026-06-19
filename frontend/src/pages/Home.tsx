import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarDays, Clock, Flag, LayoutGrid, Settings, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import {
  api,
  type HistoryMatch,
  type HistoryTournament,
  type Match,
  type Stats,
} from "../api/client";
import { DashboardSection } from "../components/DashboardSection";
import { FilterCheckboxOption, FilterMultiSelect, FilterSection, FilterSelect, FilterToggle } from "../components/FilterPanel";
import { HistoryWinnersSankey } from "../components/HistoryWinnersSankey";
import { MatchCard } from "../components/MatchCard";
import { TimezoneModal } from "../components/TimezoneModal";
import { UiButton } from "../components/UiButton";
import { usePageFilters } from "../context/FilterPanelContext";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import { useViewingMatches } from "../hooks/useViewingMatches";
import { WC_2026_PATH, FIXTURES_PATH } from "../config/appNav";
import { UPCOMING_PODIUM_YEAR } from "../utils/historyPodium";
import {
  formatResolvedTimezoneLabel,
  resolveUserTimezone,
} from "../utils/cityTimezones";
import {
  formatScheduleDayHeading,
  getMatchLocalDate,
  getMatchSortKey,
  getTodayLocalDate,
  isMatchPast,
} from "../utils/matchTime";

const HISTORY_CHART_YEAR = UPCOMING_PODIUM_YEAR;

export function Home() {
  const { preferences, updatePreferences } = useProfilePreferences();
  const [timezoneModalOpen, setTimezoneModalOpen] = useState(false);
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const timezoneLabel = formatResolvedTimezoneLabel(
    preferences.city,
    preferences.timezone,
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [historyMatches, setHistoryMatches] = useState<HistoryMatch[]>([]);
  const [tournaments, setTournaments] = useState<HistoryTournament[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [upcomingGroup, setUpcomingGroup] = useState<string | undefined>();
  const [upcomingRounds, setUpcomingRounds] = useState<string[]>([]);
  const [upcomingSavedOnly, setUpcomingSavedOnly] = useState(false);
  const { matchIds: savedMatchIds } = useViewingMatches();
  const savedMatchIdSet = useMemo(() => new Set(savedMatchIds), [savedMatchIds]);

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getMatches(),
      api.getHistoryTournaments(),
      api.getHistoryMatches(),
    ])
      .then(([statsRes, matchesRes, tournamentsRes, historyRes]) => {
        setStats(statsRes);
        setMatches(matchesRes.matches);
        setTournaments(tournamentsRes.tournaments);
        setHistoryMatches(historyRes.matches);
      })
      .catch((e) => setError(e.message));
  }, []);

  const todayLocal = getTodayLocalDate(timeZone);

  const upcomingMatches = useMemo(
    () =>
      matches
        .filter((match) => {
          const localDate = getMatchLocalDate(match.date, match.time, timeZone);
          if (localDate === todayLocal) return true;
          return !isMatchPast(match.date, match.time);
        })
        .sort(
          (a, b) =>
            getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time)
        ),
    [matches, timeZone, todayLocal]
  );

  const rounds = useMemo(
    () => [...new Set(matches.map((match) => match.round).filter(Boolean))].sort(),
    [matches]
  );

  const filteredUpcomingMatches = useMemo(
    () =>
      upcomingMatches.filter((match) => {
        if (upcomingSavedOnly && !savedMatchIdSet.has(match.id)) return false;
        if (upcomingGroup && match.group !== upcomingGroup) return false;
        if (
          upcomingRounds.length > 0 &&
          (!match.round || !upcomingRounds.includes(match.round))
        ) {
          return false;
        }
        return true;
      }),
    [upcomingMatches, upcomingSavedOnly, savedMatchIdSet, upcomingGroup, upcomingRounds]
  );

  const upcomingByDate = useMemo(() => {
    const groups = new Map<string, Match[]>();
    for (const match of filteredUpcomingMatches) {
      const localDate = getMatchLocalDate(match.date, match.time, timeZone);
      if (!localDate) continue;
      const dayMatches = groups.get(localDate) ?? [];
      dayMatches.push(match);
      groups.set(localDate, dayMatches);
    }
    return [...groups.entries()].sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  }, [filteredUpcomingMatches, timeZone]);

  const filteredTodayMatchCount = useMemo(
    () =>
      filteredUpcomingMatches.filter(
        (match) => getMatchLocalDate(match.date, match.time, timeZone) === todayLocal
      ).length,
    [filteredUpcomingMatches, timeZone, todayLocal]
  );

  const todayMatchCount = useMemo(
    () =>
      matches.filter(
        (match) => getMatchLocalDate(match.date, match.time, timeZone) === todayLocal
      ).length,
    [matches, timeZone, todayLocal]
  );

  const dashboardUpcomingByDate = useMemo(
    () => upcomingByDate.filter(([date]) => date === todayLocal),
    [upcomingByDate, todayLocal]
  );

  const hasMoreMatchesOnMatchesPage = useMemo(
    () => upcomingByDate.some(([date]) => date !== todayLocal),
    [upcomingByDate, todayLocal]
  );

  const upcomingFilterActiveCount =
    (upcomingGroup ? 1 : 0) +
    (upcomingRounds.length > 0 ? 1 : 0) +
    (upcomingSavedOnly ? 1 : 0);

  const upcomingFilterContent = useMemo(
    () => (
      <>
        <FilterSection title="Saved">
          <FilterCheckboxOption
            label="Show only saved fixtures"
            checked={upcomingSavedOnly}
            onChange={setUpcomingSavedOnly}
          />
        </FilterSection>
        <FilterSection title="Group" layout="field">
          <FilterSelect
            id="dashboard-upcoming-group"
            value={upcomingGroup ?? ""}
            options={[
              { value: "", label: "All groups" },
              ...(stats?.groups ?? []).map((group) => ({ value: group, label: group })),
            ]}
            onChange={(value) => {
              setUpcomingGroup(value || undefined);
              setUpcomingRounds([]);
            }}
          />
        </FilterSection>
        {rounds.length > 0 && (
          <FilterSection title="Round" layout="field">
            <FilterMultiSelect
              id="dashboard-upcoming-round"
              values={upcomingRounds}
              placeholder="All rounds"
              options={rounds.map((roundName) => ({
                value: roundName,
                label: roundName,
              }))}
              onChange={setUpcomingRounds}
            />
          </FilterSection>
        )}
      </>
    ),
    [rounds, stats?.groups, upcomingGroup, upcomingRounds, upcomingSavedOnly]
  );

  usePageFilters({
    title: "Fixture Filters",
    content: upcomingFilterContent,
    activeCount: upcomingFilterActiveCount,
  });

  const historyMatchCount = useMemo(
    () => tournaments.reduce((total, tournament) => total + tournament.match_count, 0),
    [tournaments]
  );

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (!stats) return <div className="loading">Loading…</div>;

  return (
    <>
      <DashboardSection
        id="wc26"
        title="2026 World Cup"
        subtitle={`${stats.team_count} teams · ${matches.length} fixtures · ${stats.player_count} players`}
        defaultOpen={false}
        action={
          <UiButton to={WC_2026_PATH} variant="wc26">
            Explore 2026
          </UiButton>
        }
      >
        <Link to={WC_2026_PATH} className="hero-banner hero-banner-link">
          <img
            src="/world-cup-2026-hero.webp"
            alt="FIFA World Cup 2026 — United States, Canada, and Mexico"
            className="hero-banner-image"
          />
        </Link>

        <div className="stats-row stats-row--compact">
          <Link to={WC_2026_PATH} className="stat-chip stat-chip-link stat-chip--with-icon">
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
      </DashboardSection>

      <DashboardSection
        id="history"
        title="History"
        subtitle={`${tournaments.length.toLocaleString()} tournaments · ${historyMatchCount.toLocaleString()} past fixtures`}
        defaultOpen={false}
        action={
          <UiButton to="/history" variant="history">
            View History
          </UiButton>
        }
      >
        {historyMatches.length > 0 ? (
          <Link
            to="/history"
            className="dashboard-history-chart-link"
            aria-label="View full World Cup history"
          >
            <HistoryWinnersSankey
              matches={historyMatches}
              rangeLabel={String(HISTORY_CHART_YEAR)}
              includeYear={HISTORY_CHART_YEAR}
              collapsible={false}
              showLegend={false}
            />
          </Link>
        ) : (
          <p className="empty-state">Past World Cup results and charts.</p>
        )}
      </DashboardSection>

      <DashboardSection
        id="matches"
        title="Schedule"
        subtitle={`${matches.length} fixtures · ${filteredUpcomingMatches.length} upcoming · ${filteredTodayMatchCount} today`}
        defaultOpen
        action={
          <UiButton to="/schedule" variant="matches">
            View Schedule
          </UiButton>
        }
      >
        <div className="stats-row stats-row--compact dashboard-matches-stats">
          <Link to={FIXTURES_PATH} className="stat-chip stat-chip-link stat-chip--with-icon">
            <span className="stat-chip-icon stat-chip-icon--fixtures" aria-hidden="true">
              <CalendarDays size={20} strokeWidth={2.25} />
            </span>
            <div className="value">{matches.length}</div>
            <div className="label">Fixtures</div>
          </Link>
          <Link to={FIXTURES_PATH} className="stat-chip stat-chip-link stat-chip--with-icon">
            <span className="stat-chip-icon stat-chip-icon--upcoming" aria-hidden="true">
              <Clock size={20} strokeWidth={2.25} />
            </span>
            <div className="value">{upcomingMatches.length}</div>
            <div className="label">Upcoming</div>
          </Link>
          <Link to={FIXTURES_PATH} className="stat-chip stat-chip-link stat-chip--with-icon">
            <span className="stat-chip-icon stat-chip-icon--today" aria-hidden="true">
              <CalendarCheck size={20} strokeWidth={2.25} />
            </span>
            <div className="value">{todayMatchCount}</div>
            <div className="label">Today</div>
          </Link>
        </div>

        <div className="dashboard-matches-toolbar">
          <h3 className="dashboard-matches-subtitle">Upcoming Fixtures</h3>
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

        {dashboardUpcomingByDate.length === 0 ? (
          <p className="empty-state dashboard-matches-empty">
            {upcomingByDate.length === 0
              ? "No upcoming fixtures scheduled."
              : "No fixtures scheduled for today."}
          </p>
        ) : (
          <div className="dashboard-upcoming-schedule">
            {dashboardUpcomingByDate.map(([date, dayMatches]) => (
              <div key={date} className="dashboard-upcoming-day">
                <h3
                  className={`matches-date-heading${date === todayLocal ? " is-today" : ""}`}
                >
                  {formatScheduleDayHeading(date, todayLocal, dayMatches)}
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
          </div>
        )}
        {hasMoreMatchesOnMatchesPage || upcomingByDate.length > 0 ? (
          <div className="dashboard-matches-more">
            <UiButton to="/schedule" variant="matches">
              View Schedule
            </UiButton>
          </div>
        ) : null}
      </DashboardSection>

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

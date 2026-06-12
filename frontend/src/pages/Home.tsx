import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { HistoryWinnersSankey } from "../components/HistoryWinnersSankey";
import { MatchCard } from "../components/MatchCard";
import { TimezoneModal } from "../components/TimezoneModal";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import { UPCOMING_PODIUM_YEAR } from "../utils/historyPodium";
import {
  formatResolvedTimezoneLabel,
  resolveUserTimezone,
} from "../utils/cityTimezones";
import {
  formatDateHeading,
  getMatchLocalDate,
  getMatchSortKey,
  getTodayLocalDate,
  isMatchPast,
} from "../utils/matchTime";

const UPCOMING_INITIAL_DAYS = 2;
const HISTORY_CHART_YEAR = UPCOMING_PODIUM_YEAR;

function DashboardSection({
  id,
  title,
  subtitle,
  subtitleExtra,
  action,
  children,
  defaultOpen = true,
}: {
  id: string;
  title: string;
  subtitle?: string;
  subtitleExtra?: ReactNode;
  action?: ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      id={id}
      className="dashboard-section"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="dashboard-section-summary">
        <div className="dashboard-section-header">
          <div className="dashboard-section-heading">
            <div className="dashboard-section-title-row">
              <h2 className="dashboard-section-title">{title}</h2>
              <span className="dashboard-section-chevron" aria-hidden="true" />
            </div>
            {subtitle || subtitleExtra ? (
              <div className="dashboard-section-subtitle-row">
                {subtitle ? (
                  <p className="dashboard-section-subtitle">{subtitle}</p>
                ) : null}
                {subtitleExtra ? (
                  <div
                    className="dashboard-section-subtitle-extra"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {subtitleExtra}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {action ? (
            <div
              className="dashboard-section-actions"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {action}
            </div>
          ) : null}
        </div>
      </summary>
      <div className="dashboard-section-body">{children}</div>
    </details>
  );
}

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
  const [visibleDayCount, setVisibleDayCount] = useState(UPCOMING_INITIAL_DAYS);
  const loadMoreDaysRef = useRef<HTMLDivElement>(null);

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

  const todayMatchCount = useMemo(
    () =>
      matches.filter(
        (match) => getMatchLocalDate(match.date, match.time, timeZone) === todayLocal
      ).length,
    [matches, timeZone, todayLocal]
  );

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
    const upcomingSection = document.getElementById(
      "upcoming-matches"
    ) as HTMLDetailsElement | null;
    if (!sentinel || !hasMoreUpcomingDays || !upcomingSection?.open) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (!upcomingSection.open) return;
        setVisibleDayCount((count) =>
          Math.min(count + 1, upcomingByDate.length)
        );
      },
      { rootMargin: "0px 0px 160px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreUpcomingDays, upcomingByDate.length, visibleDayCount]);

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
        action={
          <Link to="/26" className="dashboard-section-link dashboard-section-link--wc26">
            Explore 2026 →
          </Link>
        }
      >
        <Link to="/26" className="hero-banner hero-banner-link">
          <img
            src="/world-cup-2026-hero.webp"
            alt="FIFA World Cup 2026 — United States, Canada, and Mexico"
            className="hero-banner-image"
          />
        </Link>

        <div className="stats-row stats-row--compact">
          <Link to="/26" className="stat-chip stat-chip-link stat-chip--with-icon">
            <span className="stat-chip-icon stat-chip-icon--groups" aria-hidden="true">
              <LayoutGrid size={18} strokeWidth={2.25} />
            </span>
            <div className="value">{stats.groups.length}</div>
            <div className="label">Groups</div>
          </Link>
          <Link to="/teams" className="stat-chip stat-chip-link stat-chip--with-icon">
            <span className="stat-chip-icon stat-chip-icon--teams" aria-hidden="true">
              <Flag size={18} strokeWidth={2.25} />
            </span>
            <div className="value">{stats.team_count}</div>
            <div className="label">Teams</div>
          </Link>
          <Link to="/players" className="stat-chip stat-chip-link stat-chip--with-icon">
            <span className="stat-chip-icon stat-chip-icon--players" aria-hidden="true">
              <UserRound size={18} strokeWidth={2.25} />
            </span>
            <div className="value">{stats.player_count}</div>
            <div className="label">Players</div>
          </Link>
        </div>
      </DashboardSection>

      <DashboardSection
        id="history"
        title="History"
        subtitle={`${tournaments.length.toLocaleString()} tournaments · ${historyMatchCount.toLocaleString()} past matches`}
        action={
          <Link to="/history" className="dashboard-section-link dashboard-section-link--history">
            View History →
          </Link>
        }
      >
        {historyMatches.length > 0 ? (
          <HistoryWinnersSankey
            matches={historyMatches}
            rangeLabel={String(HISTORY_CHART_YEAR)}
            includeYear={HISTORY_CHART_YEAR}
            collapsible={false}
            showLegend={false}
          />
        ) : (
          <p className="empty-state">Past World Cup results and charts.</p>
        )}
      </DashboardSection>

      <DashboardSection
        id="matches"
        title="Matches"
        subtitle={`${matches.length} fixtures · ${upcomingMatches.length} upcoming · ${todayMatchCount} today`}
        action={
          <Link to="/matches" className="dashboard-section-link dashboard-section-link--matches">
            View Matches →
          </Link>
        }
      >
        <div className="stats-row stats-row--compact">
          <Link to="/matches" className="stat-chip stat-chip-link stat-chip--with-icon">
            <span className="stat-chip-icon stat-chip-icon--fixtures" aria-hidden="true">
              <CalendarDays size={18} strokeWidth={2.25} />
            </span>
            <div className="value">{matches.length}</div>
            <div className="label">Fixtures</div>
          </Link>
          <Link to="/matches" className="stat-chip stat-chip-link stat-chip--with-icon">
            <span className="stat-chip-icon stat-chip-icon--upcoming" aria-hidden="true">
              <Clock size={18} strokeWidth={2.25} />
            </span>
            <div className="value">{upcomingMatches.length}</div>
            <div className="label">Upcoming</div>
          </Link>
          <Link to="/matches" className="stat-chip stat-chip-link stat-chip--with-icon">
            <span className="stat-chip-icon stat-chip-icon--today" aria-hidden="true">
              <CalendarCheck size={18} strokeWidth={2.25} />
            </span>
            <div className="value">{todayMatchCount}</div>
            <div className="label">Today</div>
          </Link>
        </div>
      </DashboardSection>

      <DashboardSection
        id="upcoming-matches"
        title="Upcoming Matches"
        subtitle={`${upcomingMatches.length} fixtures · ${todayMatchCount} today`}
        subtitleExtra={
          <>
            <span className="dashboard-upcoming-timezone">{timezoneLabel}</span>
            <button
              type="button"
              className="profile-settings-btn"
              aria-label="Change timezone"
              onClick={() => setTimezoneModalOpen(true)}
            >
              <Settings size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </>
        }
        defaultOpen
      >
        {upcomingByDate.length === 0 ? (
          <p className="empty-state">No upcoming matches scheduled.</p>
        ) : (
          <div className="dashboard-upcoming-schedule">
            {visibleUpcomingByDate.map(([date, dayMatches]) => (
              <div key={date} className="dashboard-upcoming-day">
                <h3
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

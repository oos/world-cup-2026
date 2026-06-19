import { useEffect, useMemo, useState } from "react";
import { Flag, LayoutGrid, Settings, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match, type Stats } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { DashboardSection } from "../components/DashboardSection";
import { UiButton } from "../components/UiButton";
import { WorldCup2026Chart } from "../components/WorldCup2026Chart";
import { WorldCupFaqLinks } from "../components/WorldCupFaqLinks";
import { PageHeader } from "../components/PageHeader";
import { TimezoneModal } from "../components/TimezoneModal";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import {
  formatResolvedTimezoneLabel,
  resolveUserTimezone,
} from "../utils/cityTimezones";
import {
  formatScheduleDayHeading,
  getMatchLocalDate,
  getMatchSortKey,
  getTodayLocalDate,
} from "../utils/matchTime";
import {
  SCHEDULE_TABLE_VIEW,
  SCHEDULE_VIEW_PARAM,
  WC26_PLANNER_DATE_PARAM,
  WC26_PLANNER_HASH,
  WC26_PLANNER_VENUE_PARAM,
} from "../utils/worldCup2026Planner";

const TOURNAMENT_YEAR = 2026;
const SCHEDULE_LINK = "/schedule?year=2026";

export function WorldCup2026() {
  const { preferences, updatePreferences } = useProfilePreferences();
  const [timezoneModalOpen, setTimezoneModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const timezoneLabel = formatResolvedTimezoneLabel(
    preferences.city,
    preferences.timezone,
  );
  const [searchParams] = useSearchParams();
  const group = searchParams.get("group") || undefined;
  const [stats, setStats] = useState<Stats | null>(null);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hasPlannerFocus =
      location.hash === `#${WC26_PLANNER_HASH}` ||
      searchParams.has(WC26_PLANNER_DATE_PARAM);
    if (!hasPlannerFocus) return;

    const params = new URLSearchParams();
    params.set("year", "2026");
    params.set(SCHEDULE_VIEW_PARAM, SCHEDULE_TABLE_VIEW);
    const plannerDate = searchParams.get(WC26_PLANNER_DATE_PARAM);
    const plannerVenue = searchParams.get(WC26_PLANNER_VENUE_PARAM);
    if (plannerDate) params.set(WC26_PLANNER_DATE_PARAM, plannerDate);
    if (plannerVenue) params.set(WC26_PLANNER_VENUE_PARAM, plannerVenue);
    navigate(`/schedule?${params.toString()}`, { replace: true });
  }, [location.hash, navigate, searchParams]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getStats(),
      api.getMatches(),
      group ? api.getMatches(group) : Promise.resolve(null),
    ])
      .then(([statsRes, allMatchesRes, filteredMatchesRes]) => {
        setStats(statsRes);
        setAllMatches(allMatchesRes.matches);
        setMatches(
          filteredMatchesRes ? filteredMatchesRes.matches : allMatchesRes.matches
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [group]);

  const todayLocal = getTodayLocalDate(timeZone);

  const todayMatches = useMemo(
    () =>
      matches
        .filter(
          (match) => getMatchLocalDate(match.date, match.time, timeZone) === todayLocal
        )
        .sort(
          (a, b) =>
            getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time)
        ),
    [matches, timeZone, todayLocal]
  );

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading || !stats) return <div className="loading">Loading World Cup 2026…</div>;

  return (
    <>
      <PageHeader
        title={`${TOURNAMENT_YEAR} World Cup`}
        subtitle={`${stats.team_count} teams · ${matches.length} fixtures · ${stats.player_count} players`}
        showActions={false}
      />

      <div className="stats-row stats-row--compact">
        <Link to="/standings" className="stat-chip stat-chip-link stat-chip--with-icon">
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

      <WorldCup2026Chart matches={allMatches} />

      <WorldCupFaqLinks
        title="2026 World Cup FAQs"
        subtitle="Trending questions about the 2026 World Cup"
        collapsible
        defaultOpen
      />

      <DashboardSection
        id="wc26-matches"
        title="Fixtures"
        subtitle={`${todayMatches.length} today · Times in ${timezoneLabel}`}
        defaultOpen
        action={
          <UiButton to={SCHEDULE_LINK} variant="matches">
            View Schedule
          </UiButton>
        }
      >
        <div className="dashboard-matches-toolbar">
          <h3 className="dashboard-matches-subtitle">
            {formatScheduleDayHeading(todayLocal, todayLocal, todayMatches)}
          </h3>
          <div className="dashboard-matches-toolbar-controls">
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

        {todayMatches.length === 0 ? (
          <p className="empty-state dashboard-matches-empty">
            No World Cup fixtures scheduled for today.
          </p>
        ) : (
          <div className="home-match-list">
            {todayMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                showDate={false}
                showGroupAccent
              />
            ))}
          </div>
        )}
      </DashboardSection>

      <div className="wc26-schedule-cta">
        <UiButton to={SCHEDULE_LINK} variant="matches">
          View Schedule
        </UiButton>
      </div>

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

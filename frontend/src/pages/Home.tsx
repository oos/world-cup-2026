import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match, type Stats } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import {
  formatTimezoneLabel,
  resolveUserTimezone,
} from "../utils/cityTimezones";
import {
  formatDateHeading,
  getMatchLocalDate,
  getMatchSortKey,
  getTodayLocalDate,
} from "../utils/matchTime";

export function Home() {
  const { preferences } = useProfilePreferences();
  const timeZone = resolveUserTimezone(preferences.city);
  const timezoneLabel = formatTimezoneLabel(
    timeZone,
    preferences.city || undefined
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getStats(), api.getMatches()])
      .then(([statsRes, matchesRes]) => {
        setStats(statsRes);
        setMatches(matchesRes.matches);
      })
      .catch((e) => setError(e.message));
  }, []);

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
  if (!stats) return <div className="loading">Loading…</div>;

  return (
    <>
      <div className="hero-banner">
        <img
          src="/world-cup-2026-hero.webp"
          alt="FIFA World Cup 2026 — United States, Canada, and Mexico"
          className="hero-banner-image"
        />
      </div>

      <div className="stats-row">
        <Link to="/teams" className="stat-chip stat-chip-link">
          <div className="value">{stats.groups.length}</div>
          <div className="label">Groups</div>
        </Link>
        <Link to="/teams" className="stat-chip stat-chip-link">
          <div className="value">{stats.team_count}</div>
          <div className="label">Teams</div>
        </Link>
        <Link to="/players" className="stat-chip stat-chip-link">
          <div className="value">{stats.player_count}</div>
          <div className="label">Players</div>
        </Link>
      </div>

      <section className="home-today-matches">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">
              {formatDateHeading(todayLocal, todayLocal)}
            </h2>
            <p className="home-section-subtitle">
              Times in {timezoneLabel}
              {" · "}
              <Link to="/profile#profile-location" className="matches-timezone-link">
                Change
              </Link>
            </p>
          </div>
          <Link to="/matches" className="btn btn-secondary home-section-btn">
            View All Matches →
          </Link>
        </div>
        {todayMatches.length === 0 ? (
          <p className="empty-state">No matches scheduled for today.</p>
        ) : (
          <div className="home-match-list">
            {todayMatches.map((match) => (
              <MatchCard key={match.id} match={match} showDate={false} />
            ))}
          </div>
        )}
      </section>

      <AdBanner />

      <Link to="/teams" className="btn btn-primary btn-block">
        View All Teams →
      </Link>
    </>
  );
}

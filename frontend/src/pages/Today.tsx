import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { PageHeader } from "../components/PageHeader";
import { usePageMeta } from "../hooks/usePageMeta";
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

function sortDayMatches(matches: Match[]): Match[] {
  return [...matches].sort(
    (a, b) => getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time)
  );
}

export function Today() {
  usePageMeta(
    "Who Plays Today? World Cup 2026",
    "Today's World Cup 2026 fixtures in your timezone",
  );

  const { preferences } = useProfilePreferences();
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const timezoneLabel = formatResolvedTimezoneLabel(
    preferences.city,
    preferences.timezone
  );
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(() => {
    return api
      .getMatches()
      .then((response) => setMatches(response.matches))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    loadMatches().finally(() => setLoading(false));
  }, [loadMatches]);

  const todayLocal = getTodayLocalDate(timeZone);

  const { todayMatches, nextDay, nextDayMatches } = useMemo(() => {
    const dated = matches.filter((match) => match.date);
    const today = sortDayMatches(
      dated.filter((match) => getMatchLocalDate(match.date, match.time, timeZone) === todayLocal)
    );

    if (today.length > 0) {
      return { todayMatches: today, nextDay: null, nextDayMatches: [] as Match[] };
    }

    const futureDates = [
      ...new Set(
        dated
          .map((match) => getMatchLocalDate(match.date, match.time, timeZone))
          .filter((date): date is string => date != null && date > todayLocal)
      ),
    ].sort();

    const upcomingDate = futureDates[0] ?? null;
    const upcoming = upcomingDate
      ? sortDayMatches(
          dated.filter(
            (match) => getMatchLocalDate(match.date, match.time, timeZone) === upcomingDate
          )
        )
      : [];

    return { todayMatches: today, nextDay: upcomingDate, nextDayMatches: upcoming };
  }, [matches, timeZone, todayLocal]);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading today&apos;s fixtures…</div>;

  const displayMatches = todayMatches.length > 0 ? todayMatches : nextDayMatches;
  const headingDate = todayMatches.length > 0 ? todayLocal : nextDay;

  return (
    <>
      <PageHeader
        title="Who plays today?"
        subtitle={`World Cup 2026 fixtures · Times in ${timezoneLabel}`}
        accent="var(--palette-blue)"
      />

      {displayMatches.length === 0 ? (
        <div className="profile-card today-empty">
          <p className="empty-state">No World Cup fixtures scheduled for today.</p>
          <Link to="/schedule" className="btn btn-secondary">
            View full schedule
          </Link>
        </div>
      ) : (
        <>
          {todayMatches.length === 0 && nextDay ? (
            <p className="today-fallback-copy">
              No fixtures today — showing the next World Cup matchday on{" "}
              {formatScheduleDayHeading(nextDay, todayLocal, nextDayMatches)}.
            </p>
          ) : null}

          <section className="matches-date-section">
            {headingDate ? (
              <h2 className="matches-date-heading is-today">
                {formatScheduleDayHeading(headingDate, todayLocal, displayMatches)}
              </h2>
            ) : null}
            <div className="home-match-list">
              {displayMatches.map((match) => (
                <MatchCard key={match.id} match={match} showDate={false} showGroupAccent />
              ))}
            </div>
          </section>

          <div className="today-footer-links">
            <Link to="/schedule">Full schedule →</Link>
            <Link to="/standings">Group tables →</Link>
          </div>
        </>
      )}

      <AdBanner />
    </>
  );
}

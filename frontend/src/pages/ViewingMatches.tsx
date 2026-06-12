import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { PageHeader } from "../components/PageHeader";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import { useViewingMatches } from "../hooks/useViewingMatches";
import { resolveUserTimezone } from "../utils/cityTimezones";
import {
  formatDateHeading,
  getMatchLocalDate,
  getMatchSortKey,
  getTodayLocalDate,
} from "../utils/matchTime";

type ViewingScheduleItem =
  | { kind: "heading"; date: string }
  | { kind: "match"; match: Match };

export function ViewingMatches() {
  const { matchIds } = useViewingMatches();
  const { preferences } = useProfilePreferences();
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const todayLocal = getTodayLocalDate(timeZone);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (matchIds.length === 0) {
      setMatches([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    api
      .getMatches()
      .then((response) => {
        const matchIdSet = new Set(matchIds);
        setMatches(response.matches.filter((match) => matchIdSet.has(match.id)));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [matchIds]);

  const scheduleItems = useMemo(() => {
    const sorted = [...matches].sort(
      (a, b) => getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time),
    );

    const items: ViewingScheduleItem[] = [];
    let lastDate: string | null = null;

    for (const match of sorted) {
      const localDate = getMatchLocalDate(match.date, match.time, timeZone) ?? match.date;
      if (!localDate) continue;
      if (localDate !== lastDate) {
        items.push({ kind: "heading", date: localDate });
        lastDate = localDate;
      }
      items.push({ kind: "match", match });
    }

    return items;
  }, [matches, timeZone]);

  return (
    <>
      <PageHeader
        title="Viewing Matches"
        subtitle="Matches you plan to watch during the 2026 World Cup."
        accent="var(--palette-green)"
      />

      {loading && matchIds.length > 0 ? (
        <div className="profile-card">
          <p className="viewing-matches-loading">Loading your matches…</p>
        </div>
      ) : error ? (
        <div className="error">Failed to load: {error}</div>
      ) : matchIds.length === 0 ? (
        <div className="profile-card">
          <div className="profile-empty">
            <Eye size={28} strokeWidth={1.75} aria-hidden="true" />
            <p>No viewing matches yet.</p>
            <p className="viewing-matches-empty-hint">
              Open a match and tap the eye icon to add it here.
            </p>
            <Link to="/matches" className="profile-link">
              Browse matches
              <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : scheduleItems.length === 0 ? (
        <div className="profile-card">
          <div className="profile-empty">
            <CalendarDays size={28} strokeWidth={1.75} aria-hidden="true" />
            <p>Your saved matches could not be found.</p>
            <Link to="/matches" className="profile-link">
              Browse matches
              <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="viewing-matches-list">
          {scheduleItems.map((item) =>
            item.kind === "heading" ? (
              <h2 key={`heading-${item.date}`} className="match-date-heading">
                {formatDateHeading(item.date, todayLocal)}
              </h2>
            ) : (
              <MatchCard key={item.match.id} match={item.match} showDate={false} />
            ),
          )}
        </div>
      )}

      <AdBanner />
    </>
  );
}

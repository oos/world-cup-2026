import { useEffect, useState } from "react";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match, type Stats } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { PageHeader } from "../components/PageHeader";
import { WorldCupFaqLinks } from "../components/WorldCupFaqLinks";
import {
  formatLongDate,
  formatTournamentDateRange,
  summarizeTournament,
} from "../utils/tournamentDates";

export function Guide() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getStats(), api.getMatches()])
      .then(([statsRes, matchesRes]) => {
        setStats(statsRes);
        setMatches(matchesRes.matches);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading || !stats) return <div className="loading">Loading tournament guide…</div>;

  const summary = summarizeTournament(matches);

  return (
    <>
      <PageHeader
        title="When is World Cup 2026?"
        subtitle="Key dates, format, and quick links for the biggest searches right now."
        accent="var(--palette-orange)"
      />

      <div className="profile-card guide-hero">
        <div className="guide-hero-label">Tournament dates</div>
        <div className="guide-hero-value">
          {formatTournamentDateRange(summary.startDate, summary.endDate)}
        </div>
        <p className="guide-hero-copy">
          The 2026 FIFA World Cup runs for 39 days across the United States, Canada, and Mexico —
          the first edition with 48 teams and 12 groups.
        </p>
      </div>

      <div className="stats-row">
        <div className="stat-chip">
          <div className="value">{stats.team_count}</div>
          <div className="label">Teams</div>
        </div>
        <div className="stat-chip">
          <div className="value">{stats.groups.length}</div>
          <div className="label">Groups</div>
        </div>
        <div className="stat-chip">
          <div className="value">{summary.matchCount}</div>
          <div className="label">Fixtures</div>
        </div>
        <div className="stat-chip">
          <div className="value">3</div>
          <div className="label">Host nations</div>
        </div>
      </div>

      {summary.openingMatch ? (
        <section className="guide-section">
          <h2 className="section-title">Opening match</h2>
          <p className="guide-section-copy">
            The tournament kicks off on {formatLongDate(summary.startDate)}.
          </p>
          <MatchCard match={summary.openingMatch} showDate={false} />
        </section>
      ) : null}

      {summary.finalMatch ? (
        <section className="guide-section">
          <h2 className="section-title">Final</h2>
          <p className="guide-section-copy">
            The World Cup final is on {formatLongDate(summary.endDate)}.
          </p>
          <MatchCard match={summary.finalMatch} showDate={false} />
        </section>
      ) : null}

      <WorldCupFaqLinks title="Popular searches" />

      <AdBanner />
    </>
  );
}

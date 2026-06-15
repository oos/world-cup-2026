import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type HistoryMatch } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { TeamFlag } from "../components/TeamFlag";
import { buildYearPodiumMap, type YearPodium } from "../utils/historyPodium";

function PodiumRow({
  place,
  team,
  highlight = false,
}: {
  place: string;
  team: string;
  highlight?: boolean;
}) {
  return (
    <div className={`winners-podium-row ${highlight ? "winners-podium-row--highlight" : ""}`}>
      <span className="winners-podium-place">{place}</span>
      <TeamFlag teamName={team} variant="badge" className="winners-podium-flag" />
      <span className="winners-podium-team">{team}</span>
    </div>
  );
}

function WinnerCard({ year, podium }: { year: number; podium: YearPodium }) {
  return (
    <Link to={`/history?year=${year}`} className="profile-card winners-card">
      <div className="winners-card-year">{year}</div>
      <PodiumRow place="1st" team={podium.first} highlight />
      <PodiumRow place="2nd" team={podium.second} />
      {podium.third ? <PodiumRow place="3rd" team={podium.third} /> : null}
    </Link>
  );
}

export function Winners() {
  const [matches, setMatches] = useState<HistoryMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getHistoryMatches()
      .then((response) => setMatches(response.matches))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const podiums = useMemo(() => buildYearPodiumMap(matches), [matches]);
  const sortedYears = useMemo(
    () => [...podiums.entries()].sort(([a], [b]) => b - a),
    [podiums]
  );
  const recentYears = sortedYears.filter(([year]) => year >= 2006);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading past winners…</div>;

  return (
    <>
      <PageHeader
        title="Past World Cup winners"
        subtitle="Every champion since 1930 — a top search alongside the 2026 tournament"
        accent="var(--palette-navy)"
      />

      {recentYears.length > 0 ? (
        <section className="winners-section">
          <h2 className="section-title">Recent tournaments</h2>
          <div className="winners-grid">
            {recentYears.map(([year, podium]) => (
              <WinnerCard key={year} year={year} podium={podium} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="winners-section">
        <h2 className="section-title">All winners</h2>
        <div className="profile-card winners-list">
          {sortedYears.map(([year, podium]) => (
            <Link key={year} to={`/history?year=${year}`} className="winners-list-row">
              <span className="winners-list-year">{year}</span>
              <TeamFlag teamName={podium.first} variant="badge" className="winners-list-flag" />
              <span className="winners-list-champion">{podium.first}</span>
              <span className="winners-list-runner-up">{podium.second}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="today-footer-links">
        <Link to="/history">Explore full history →</Link>
      </div>

      <AdBanner />
    </>
  );
}

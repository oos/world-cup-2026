import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type HistoryMatch } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { TeamFlag } from "../components/TeamFlag";
import { buildYearPodiumMap, type YearPodium } from "../utils/historyPodium";
import { getHistoricWorldRanking } from "../utils/fifaWorldRankingsHistoric";
import { formatTeamWorldRanking } from "../utils/teamWorldRanking";

type WinnersView = "recent" | "all";

function HistoricRankingTag({ year, team }: { year: number; team: string }) {
  const ranking = getHistoricWorldRanking(year, team);
  if (ranking == null) return null;

  return (
    <span
      className="team-world-rank winners-rank-tag"
      aria-label={`FIFA world ranking ${ranking}`}
    >
      {formatTeamWorldRanking(ranking)}
    </span>
  );
}

function PodiumRow({
  year,
  place,
  team,
  highlight = false,
}: {
  year: number;
  place: string;
  team: string;
  highlight?: boolean;
}) {
  return (
    <div className={`winners-podium-row ${highlight ? "winners-podium-row--highlight" : ""}`}>
      <span className="winners-podium-place">{place}</span>
      <TeamFlag teamName={team} variant="badge" className="winners-podium-flag" />
      <span className="winners-podium-team-cell">
        <span className="winners-podium-team">{team}</span>
        <HistoricRankingTag year={year} team={team} />
      </span>
    </div>
  );
}

function WinnerCard({ year, podium }: { year: number; podium: YearPodium }) {
  return (
    <Link to={`/history?year=${year}`} className="profile-card winners-card">
      <div className="winners-card-body">
        <div className="winners-card-year">{year}</div>
        <div className="winners-card-podium">
          <PodiumRow year={year} place="1st" team={podium.first} highlight />
          <PodiumRow year={year} place="2nd" team={podium.second} />
          {podium.third ? <PodiumRow year={year} place="3rd" team={podium.third} /> : null}
        </div>
      </div>
    </Link>
  );
}

function ExploreHistoryLink() {
  return (
    <Link to="/history" className="winners-history-link">
      Explore full history →
    </Link>
  );
}

function ExploreHistoryButton() {
  return (
    <Link to="/history" className="btn btn-secondary" data-track-button="explore_full_history">
      Explore full history →
    </Link>
  );
}

function WinnersListTeam({
  year,
  team,
  variant,
}: {
  year: number;
  team: string;
  variant: "champion" | "runner-up";
}) {
  return (
    <span className={`winners-list-team winners-list-team--${variant}`}>
      <span className="winners-list-team-name">{team}</span>
      <HistoricRankingTag year={year} team={team} />
    </span>
  );
}

export function Winners() {
  const [matches, setMatches] = useState<HistoryMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WinnersView>("recent");

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
  const pageSubtitle =
    activeView === "recent"
      ? "Top 3 from recent tournaments"
      : "Every champion since 1930";

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading past winners…</div>;

  return (
    <>
      <PageHeader
        title="Past World Cup winners"
        subtitle={
          <span className="winners-page-subtitle">
            {pageSubtitle}
            <span className="winners-page-subtitle-sep" aria-hidden="true">·</span>
            <ExploreHistoryLink />
          </span>
        }
        accent="var(--palette-navy)"
        showActions={false}
      />

      <div className="winners-tabs">
        <SegmentedTabs
          ariaLabel="Winners views"
          tabs={[
            { id: "recent", label: "Recent winners" },
            { id: "all", label: "All winners" },
          ]}
          value={activeView}
          onChange={setActiveView}
        />

        {activeView === "recent" ? (
          <section className="winners-section" role="tabpanel" aria-label="Recent winners">
            {recentYears.length > 0 ? (
              <div className="winners-grid">
                {recentYears.map(([year, podium]) => (
                  <WinnerCard key={year} year={year} podium={podium} />
                ))}
              </div>
            ) : (
              <p className="empty-state">No recent tournaments found.</p>
            )}
          </section>
        ) : (
          <section className="winners-section" role="tabpanel" aria-label="All winners">
            <div className="profile-card winners-list">
              {sortedYears.map(([year, podium]) => (
                <Link key={year} to={`/history?year=${year}`} className="winners-list-row">
                  <span className="winners-list-year">{year}</span>
                  <div className="winners-list-matchup">
                    <TeamFlag teamName={podium.first} variant="badge" className="winners-list-flag" />
                    <WinnersListTeam year={year} team={podium.first} variant="champion" />
                    <span className="winners-list-vs" aria-hidden="true">v</span>
                    <WinnersListTeam year={year} team={podium.second} variant="runner-up" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="winners-footer-action">
        <ExploreHistoryButton />
      </div>

      <AdBanner />
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AdBanner } from "../ads/AdBanner";
import { api, type Team } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { WorldCupSearchTrendChart } from "../components/WorldCupSearchTrendChart";
import { WORLD_CUP_SEARCH_TREND } from "../config/worldCupSearchTrend";

const HOST_NATION_CODES = new Set(["USA", "MEX", "CAN"]);

export function Trends() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTeams()
      .then((response) => setTeams(response.teams))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const hostTeams = useMemo(
    () => teams.filter((team) => HOST_NATION_CODES.has(team.fifa_code)),
    [teams]
  );

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading search trends…</div>;

  return (
    <>
      <PageHeader
        title="Trends"
        subtitle="Google search interest ahead of World Cup 2026"
        accent="var(--palette-orange)"
      />

      <section className="trends-section">
        <h2 className="section-title">
          Which World Cup squads are people searching for, and how has that interest changed
          over the past year?
        </h2>
        <p className="trends-section-subtitle">
          All {teams.length} squads · worldwide · past 12 months
        </p>
        <div className="profile-card trends-page-chart">
          <WorldCupSearchTrendChart teams={teams} hideSubtitle showSource={false} />
        </div>
      </section>

      <section className="trends-section">
        <h2 className="section-title">How is overall World Cup search interest trending?</h2>
        <p className="trends-section-subtitle">
          Global "world cup" searches · past 12 months
        </p>
        <div className="profile-card trends-page-chart">
          <WorldCupSearchTrendChart
            customSeries={[
              {
                id: "world-cup",
                label: "World Cup",
                color: "var(--palette-orange)",
                points: WORLD_CUP_SEARCH_TREND,
              },
            ]}
            hideSubtitle
            legendScroll={false}
          />
        </div>
      </section>

      <section className="trends-section">
        <h2 className="section-title">How much search interest are the host nations drawing?</h2>
        <p className="trends-section-subtitle">USA, Mexico, and Canada · co-hosts 2026</p>
        <div className="profile-card trends-page-chart">
          <WorldCupSearchTrendChart
            teams={hostTeams}
            hideSubtitle
            showSource={false}
            legendScroll={false}
          />
        </div>
      </section>

      <AdBanner />
    </>
  );
}

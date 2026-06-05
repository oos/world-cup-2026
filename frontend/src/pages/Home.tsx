import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Stats } from "../api/client";
import { FilterLink, FilterSection } from "../components/FilterPanel";
import { PageHeaderActions } from "../components/PageHeader";
import { usePageFilters } from "../context/FilterPanelContext";

export function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  const filterContent = useMemo(
    () =>
      stats ? (
        <FilterSection title="Browse by Group">
          {stats.groups.map((g) => (
            <FilterLink key={g} label={g} to={`/teams?group=${encodeURIComponent(g)}`} />
          ))}
        </FilterSection>
      ) : (
        <div className="loading">Loading…</div>
      ),
    [stats]
  );

  usePageFilters({
    title: "Browse",
    content: filterContent,
    activeCount: 0,
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (!stats) return <div className="loading">Loading…</div>;

  return (
    <>
      <div className="hero">
        <div className="page-header-row">
          <div>
            <h1>World Cup 2026</h1>
            <p>Canada · Mexico · USA — Browse all 48 team squads</p>
          </div>
          <PageHeaderActions />
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-chip">
          <div className="value">{stats.team_count}</div>
          <div className="label">Teams</div>
        </div>
        <div className="stat-chip">
          <div className="value">{stats.player_count}</div>
          <div className="label">Players</div>
        </div>
        <div className="stat-chip">
          <div className="value">{stats.groups.length}</div>
          <div className="label">Groups</div>
        </div>
      </div>

      <AdBanner />

      <Link to="/teams" className="btn btn-primary btn-block">
        View All Teams →
      </Link>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AdBanner } from "../ads/AdBanner";
import { api, type Team } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { TeamCard } from "../components/TeamCard";

import { TRENDING_SQUAD_CODE_SET } from "../config/trendingSquads";

export function Squads() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTeams()
      .then((response) => setTeams(response.teams))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );

  const trendingTeams = useMemo(
    () =>
      sortedTeams.filter((team) => TRENDING_SQUAD_CODE_SET.has(team.fifa_code)),
    [sortedTeams]
  );

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return sortedTeams.filter((team) =>
      team.name.toLowerCase().includes(normalizedQuery)
    );
  }, [sortedTeams, normalizedQuery]);

  const otherTeams = useMemo(() => {
    if (normalizedQuery) return [];
    return sortedTeams.filter((team) => !TRENDING_SQUAD_CODE_SET.has(team.fifa_code));
  }, [sortedTeams, normalizedQuery]);

  const showTrending = !normalizedQuery && trendingTeams.length > 0;
  const mainSectionTeams = normalizedQuery
    ? searchResults
    : showTrending
      ? otherTeams
      : sortedTeams;
  const mainSectionTitle = normalizedQuery
    ? "Search results"
    : showTrending
      ? "All other squads"
      : "All squads";

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading squads…</div>;

  return (
    <>
      <PageHeader
        title="World Cup 2026 squads"
        subtitle="Browse every national team squad — a top search as teams announce their players."
        accent="var(--palette-navy)"
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search teams…"
        />
      </PageHeader>

      {showTrending ? (
        <section className="squads-section">
          <h2 className="section-title">Trending squads</h2>
          <div className="team-grid">
            {trendingTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="squads-section">
        <h2 className="section-title">{mainSectionTitle}</h2>
        {mainSectionTeams.length === 0 ? (
          <p className="empty-state">No teams match your search.</p>
        ) : (
          <div className="team-grid">
            {mainSectionTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </section>

      <p className="guide-footer-note">
        Open a team to see its full squad, player profiles, and World Cup history.
      </p>

      <AdBanner />
    </>
  );
}

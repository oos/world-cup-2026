import { useEffect, useMemo, useState } from "react";
import { AdBanner } from "../ads/AdBanner";
import { api, type Team } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { PageToolbar } from "../components/PageToolbar";
import { SearchInput } from "../components/SearchInput";
import { TeamCard } from "../components/TeamCard";

const TRENDING_SQUAD_CODES = new Set([
  "ENG",
  "BRA",
  "GER",
  "ESP",
  "ARG",
  "POR",
  "FRA",
  "MEX",
]);

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

  const trendingTeams = useMemo(
    () =>
      teams
        .filter((team) => TRENDING_SQUAD_CODES.has(team.fifa_code))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );

  const filteredTeams = useMemo(() => {
    const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));
    if (!normalizedQuery) return sorted;
    return sorted.filter((team) => team.name.toLowerCase().includes(normalizedQuery));
  }, [teams, normalizedQuery]);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading squads…</div>;

  return (
    <>
      <PageHeader
        title="World Cup 2026 squads"
        subtitle="Browse every national team squad — a top search as teams announce their players."
        accent="var(--palette-navy)"
      />

      {!normalizedQuery && trendingTeams.length > 0 ? (
        <section className="squads-section">
          <h2 className="section-title">Trending squads</h2>
          <div className="team-grid">
            {trendingTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      ) : null}

      <PageToolbar
        search={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search teams…"
          />
        }
      />

      <section className="squads-section">
        <h2 className="section-title">
          {normalizedQuery ? "Search results" : "All squads"}
        </h2>
        {filteredTeams.length === 0 ? (
          <p className="empty-state">No teams match your search.</p>
        ) : (
          <div className="team-grid">
            {filteredTeams.map((team) => (
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

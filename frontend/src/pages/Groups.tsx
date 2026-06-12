import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Team } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { TeamFlag } from "../components/TeamFlag";
import { useReturnToLink } from "../hooks/useNavigation";

function GroupTeamRow({ team }: { team: Team }) {
  const href = useReturnToLink(`/teams/${team.id}`);

  return (
    <Link to={href} className="groups-team-row">
      <TeamFlag fifaCode={team.fifa_code} teamName={team.name} className="groups-team-flag" />
      <span className="groups-team-name">{team.name}</span>
      <span className="groups-team-meta">{team.player_count} players</span>
    </Link>
  );
}

function groupTeamsByGroup(teams: Team[]): { group: string; teams: Team[] }[] {
  const grouped = new Map<string, Team[]>();
  for (const team of teams) {
    const key = team.group || "Other";
    const existing = grouped.get(key) ?? [];
    existing.push(team);
    grouped.set(key, existing);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, groupTeams]) => ({
      group,
      teams: groupTeams.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function Groups() {
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

  const groupedTeams = useMemo(() => groupTeamsByGroup(teams), [teams]);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading groups…</div>;

  return (
    <>
      <PageHeader
        title="World Cup 2026 groups"
        subtitle={`${groupedTeams.length} groups · ${teams.length} teams`}
        accent="var(--palette-teal)"
      />

      <div className="groups-grid">
        {groupedTeams.map(({ group, teams: groupTeams }) => (
          <section key={group} className="profile-card groups-card">
            <div className="groups-card-header">
              <h2 className="groups-card-title">{group}</h2>
              <Link to={`/schedule?group=${encodeURIComponent(group)}`} className="groups-card-link">
                Fixtures →
              </Link>
            </div>
            <div className="groups-team-list">
              {groupTeams.map((team) => (
                <GroupTeamRow key={team.id} team={team} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <AdBanner />
    </>
  );
}

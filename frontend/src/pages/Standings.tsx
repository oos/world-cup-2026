import { useEffect, useMemo, useState } from "react";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match, type Team } from "../api/client";
import { GroupStandingsPanel } from "../components/GroupStandingsPanel";
import { PageHeader } from "../components/PageHeader";
import { buildGroupStandings } from "../utils/worldCup2026Standings";

export function Standings() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getTeams(), api.getMatches()])
      .then(([teamsRes, matchesRes]) => {
        setTeams(teamsRes.teams);
        setMatches(matchesRes.matches);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const standings = useMemo(() => buildGroupStandings(matches, teams), [matches, teams]);
  const playedGroupMatches = matches.filter(
    (match) => match.round?.startsWith("Matchday") && match.score?.ft
  ).length;

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading group standings…</div>;

  return (
    <>
      <PageHeader
        title="World Cup 2026 standings"
        subtitle={`Live group tables · ${playedGroupMatches} group-stage results played`}
        accent="var(--palette-teal)"
      />

      <div className="standings-grid">
        {standings.map((group) => (
          <GroupStandingsPanel key={group.groupLetter} group={group} />
        ))}
      </div>

      <AdBanner />
    </>
  );
}

import { Link } from "react-router-dom";
import type { Team } from "../api/client";
import { useReturnToLink } from "../hooks/useNavigation";
import { TeamFlag } from "./TeamFlag";
import { TeamCardName } from "./TeamCardName";

export function TeamCard({ team }: { team: Team }) {
  const href = useReturnToLink(`/teams/${team.id}`);

  return (
    <Link to={href} className="team-card-wrap">
      <div className="team-card">
        <TeamFlag fifaCode={team.fifa_code} teamName={team.name} />
      </div>
      <TeamCardName
        name={team.name}
        fifaCode={team.fifa_code}
        worldRanking={team.world_ranking}
      />
      <div className="team-card-meta">{team.group}</div>
    </Link>
  );
}

import { Link } from "react-router-dom";
import type { Team } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import { TeamCardName } from "./TeamCardName";

export function TeamCard({ team }: { team: Team }) {
  return (
    <Link to={`/teams/${team.id}`} className="team-card-wrap">
      <div className="team-card">
        <TeamFlag fifaCode={team.fifa_code} teamName={team.name} />
        <div className="team-card-content">
          <TeamCardName name={team.name} />
        </div>
      </div>
      <div className="team-card-meta">{team.group}</div>
    </Link>
  );
}

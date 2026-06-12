import { Link } from "react-router-dom";
import type { Team } from "../api/client";
import { TeamFlag } from "./TeamFlag";

export function TeamRow({ team }: { team: Team }) {
  const details = [team.group, team.confederation, `${team.player_count} players`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link to={`/teams/${team.id}`} className="team-row">
      <TeamFlag
        fifaCode={team.fifa_code}
        teamName={team.name}
        variant="badge"
        className="team-row-flag"
      />
      <div className="team-row-info">
        <div className="team-row-name">{team.name}</div>
        <div className="team-row-meta">{details}</div>
      </div>
    </Link>
  );
}

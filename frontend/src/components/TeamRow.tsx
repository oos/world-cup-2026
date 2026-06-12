import { Link } from "react-router-dom";
import type { Team } from "../api/client";
import { useReturnToLink } from "../hooks/useNavigation";
import { TeamNameWithFlag } from "./TeamNameWithFlag";

export function TeamRow({ team }: { team: Team }) {
  const href = useReturnToLink(`/teams/${team.id}`);
  const details = [team.group, team.confederation, `${team.player_count} players`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link to={href} className="team-row">
      <TeamNameWithFlag
        name={team.name}
        fifaCode={team.fifa_code}
        flagIso={team.flag_iso}
        worldRanking={team.world_ranking}
        variant="badge"
        flagClassName="team-row-flag"
        nameClassName="team-row-name"
        className="team-row-name-wrap"
      />
      <div className="team-row-info">
        <div className="team-row-meta">{details}</div>
      </div>
    </Link>
  );
}

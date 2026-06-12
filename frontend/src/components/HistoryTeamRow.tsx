import type { HistoryTeam } from "../api/client";
import { TeamFlag } from "./TeamFlag";

export function HistoryTeamRow({ team }: { team: HistoryTeam }) {
  return (
    <div className="team-row team-row--static">
      <TeamFlag teamName={team.name} variant="badge" className="team-row-flag" />
      <div className="team-row-info">
        <div className="team-row-name">{team.name}</div>
        {team.group ? <div className="team-row-meta">{team.group}</div> : null}
      </div>
    </div>
  );
}

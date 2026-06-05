import type { HistoryTeam } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import { TeamCardName } from "./TeamCardName";

export function HistoryTeamCard({ team }: { team: HistoryTeam }) {
  return (
    <div className="team-card-wrap team-card-wrap--static">
      <div className="team-card team-card-static">
        <TeamFlag teamName={team.name} />
        <div className="team-card-content">
          <TeamCardName name={team.name} />
        </div>
      </div>
      {team.group ? <div className="team-card-meta">{team.group}</div> : null}
    </div>
  );
}

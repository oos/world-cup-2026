import { Link } from "react-router-dom";
import type { Player } from "../api/client";
import { PlayerAvatar } from "./PlayerAvatar";
import { TeamFlag } from "./TeamFlag";

export function PlayerRow({
  player,
  showNationalTeam = true,
}: {
  player: Player;
  showNationalTeam?: boolean;
}) {
  return (
    <Link to={`/players/${player.id}`} className="player-row">
      <span className="number">{player.jersey_number ?? "–"}</span>
      <PlayerAvatar className="avatar" />
      <div className="info">
        <div className="name">{player.name}</div>
        <div className="player-row-club">{player.club || "—"}</div>
        {showNationalTeam && player.team_name ? (
          <div className="player-row-team">
            <TeamFlag
              fifaCode={player.team_fifa_code}
              teamName={player.team_name}
              variant="badge"
              className="player-row-team-flag"
            />
            <span>{player.team_name}</span>
          </div>
        ) : null}
        <div className="player-row-meta">{player.position || "—"}</div>
      </div>
    </Link>
  );
}

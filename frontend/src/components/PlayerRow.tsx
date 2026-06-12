import { Link } from "react-router-dom";
import type { Player } from "../api/client";
import { useReturnToLink } from "../hooks/useNavigation";
import { ClubBadge } from "./ClubBadge";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerHonoursSummary } from "./PlayerHonoursSummary";
import { TeamNameWithFlag } from "./TeamNameWithFlag";
import { getClubDisplayLabel, hasClubName } from "../utils/playerClub";

function positionAbbrev(position: string | null): string | null {
  if (!position) return null;
  const key = position.toUpperCase();
  if (key.startsWith("GK")) return "GK";
  if (key.startsWith("DF") || key.startsWith("DEF")) return "DEF";
  if (key.startsWith("MF") || key.startsWith("MID")) return "MID";
  if (key.startsWith("FW") || key.startsWith("FWD")) return "FWD";
  return position;
}

function playerAge(dob: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDelta = today.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
}

export function PlayerRow({
  player,
  showNationalTeam = true,
}: {
  player: Player;
  showNationalTeam?: boolean;
}) {
  const href = useReturnToLink(`/players/${player.id}`);
  const position = positionAbbrev(player.position);
  const age = playerAge(player.dob);
  const height =
    player.height_cm != null ? `${Math.round(player.height_cm)} cm` : null;

  const clubLabel = getClubDisplayLabel(player);
  const showClubBadge = hasClubName(player);

  return (
    <Link to={href} className="player-row">
      {player.jersey_number != null ? (
        <span className="number">{player.jersey_number}</span>
      ) : null}
      <PlayerAvatar className="avatar" />
      <div className="info">
        <div className="name">{player.name}</div>
        {showNationalTeam && player.team_name ? (
          <div className="player-row-team">
            <span className="player-row-label">Country:</span>
            <TeamNameWithFlag
              name={player.team_name}
              fifaCode={player.team_fifa_code}
              flagClassName="player-row-team-flag"
            />
          </div>
        ) : null}
        <div className="player-row-club">
          <span className="player-row-label">Club:</span>
          <span
            className={`player-row-value${showClubBadge ? "" : " player-row-value--status"}`}
          >
            {clubLabel}
          </span>
          {showClubBadge ? (
            <ClubBadge clubName={player.club} className="player-row-club-badge" />
          ) : null}
        </div>
        <PlayerHonoursSummary honours={player.major_honours} />
      </div>
      {(position || age != null || height) && (
        <div className="player-row-stats" aria-label="Player stats">
          {position ? (
            <span className="player-row-stat player-row-stat--position">{position}</span>
          ) : null}
          {age != null ? <span className="player-row-stat">{age}</span> : null}
          {height ? <span className="player-row-stat">{height}</span> : null}
        </div>
      )}
    </Link>
  );
}

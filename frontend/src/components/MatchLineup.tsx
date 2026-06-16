import type { MatchLineup as MatchLineupType } from "../api/client";
import { FormationPitch } from "./FormationPitch";
import { PlayerRow } from "./PlayerRow";

export function MatchLineup({ lineup }: { lineup: MatchLineupType }) {
  const substitutes = lineup.substitutes ?? [];
  const formation = lineup.formation ?? "4-3-3";

  return (
    <div className="match-lineup">
      {lineup.formation && (
        <p className="match-lineup-formation">{lineup.formation} formation</p>
      )}
      <FormationPitch formation={formation} players={lineup.players} />
      {substitutes.length > 0 && (
        <section className="match-lineup-subs">
          <h3 className="match-lineup-subs-title">
            Substitutes ({substitutes.length})
          </h3>
          {substitutes.map((player) => (
            <PlayerRow key={player.id || player.name} player={player} showNationalTeam={false} />
          ))}
        </section>
      )}
    </div>
  );
}

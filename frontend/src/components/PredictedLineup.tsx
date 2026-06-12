import type { PredictedLineup as PredictedLineupType } from "../api/client";
import { FormationPitch } from "./FormationPitch";
import { PlayerRow } from "./PlayerRow";

export function PredictedLineup({ lineup }: { lineup: PredictedLineupType }) {
  const substitutes = lineup.substitutes ?? [];

  return (
    <div className="predicted-lineup">
      <p className="predicted-lineup-formation">
        Predicted {lineup.formation} formation
      </p>
      <FormationPitch formation={lineup.formation} players={lineup.players} />
      {substitutes.length > 0 && (
        <section className="predicted-lineup-subs">
          <h3 className="predicted-lineup-subs-title">
            Substitutes ({substitutes.length})
          </h3>
          {substitutes.map((player) => (
            <PlayerRow key={player.id} player={player} showNationalTeam={false} />
          ))}
        </section>
      )}
    </div>
  );
}

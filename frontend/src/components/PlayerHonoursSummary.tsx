import type { PlayerMajorHonour } from "../api/client";
import { majorHonourShortLabel } from "../utils/playerHonours";

export function PlayerHonoursSummary({
  honours,
}: {
  honours?: PlayerMajorHonour[];
}) {
  if (!honours?.length) return null;

  return (
    <div className="player-row-honours" aria-label="Major honours">
      {honours.map((honour) => (
        <span
          key={honour.key}
          className="player-row-honour-chip"
          title={`${honour.label}: ${honour.count}`}
        >
          <span className="player-row-honour-chip-label">
            {majorHonourShortLabel(honour)}
          </span>
          <span className="player-row-honour-chip-count">{honour.count}</span>
        </span>
      ))}
    </div>
  );
}

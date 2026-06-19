import { useMemo } from "react";
import { LayoutGrid, MapPin, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import type { Match } from "../api/client";
import { WC26_PLANNER_VENUES } from "../utils/worldCup2026Planner";

const KNOCKOUT_PREDICTIONS_PATH = "/knockout-predictions";

export function WorldCup2026Chart({ matches }: { matches: Match[] }) {
  const groupStageMeta = useMemo(() => {
    const played = matches.filter(
      (match) => match.round?.startsWith("Matchday") && match.score?.ft
    ).length;
    const total = matches.filter((match) => match.round?.startsWith("Matchday")).length;
    return `${played}/${total} played`;
  }, [matches]);

  const knockoutMeta = useMemo(() => {
    const knockoutCount = matches.filter(
      (match) => match.round && !match.round.startsWith("Matchday")
    ).length;
    return `${knockoutCount} knockout fixtures`;
  }, [matches]);

  const scheduleTableHref = "/schedule";

  return (
    <div className="wc26-chart-stack">
      <Link to="/venues" className="wc26-planner-promo">
        <span className="wc26-planner-promo-icon" aria-hidden="true">
          <MapPin size={22} strokeWidth={2.1} />
        </span>
        <span className="wc26-planner-promo-copy">
          <span className="wc26-planner-promo-title">Host Cities &amp; Stadiums</span>
          <span className="wc26-planner-promo-meta">
            {WC26_PLANNER_VENUES.length} stadium cities across North America
          </span>
          <span className="wc26-planner-promo-action">View host cities →</span>
        </span>
      </Link>

      <Link to={scheduleTableHref} className="wc26-planner-promo">
        <span className="wc26-planner-promo-icon" aria-hidden="true">
          <LayoutGrid size={22} strokeWidth={2.1} />
        </span>
        <span className="wc26-planner-promo-copy">
          <span className="wc26-planner-promo-title">World Cup planner</span>
          <span className="wc26-planner-promo-meta">
            Venue grid by date · {groupStageMeta}
          </span>
          <span className="wc26-planner-promo-action">Open schedule table →</span>
        </span>
      </Link>

      <Link to={KNOCKOUT_PREDICTIONS_PATH} className="wc26-planner-promo">
        <span className="wc26-planner-promo-icon" aria-hidden="true">
          <Trophy size={22} strokeWidth={2.1} />
        </span>
        <span className="wc26-planner-promo-copy">
          <span className="wc26-planner-promo-title">Knockout predictions</span>
          <span className="wc26-planner-promo-meta">{knockoutMeta}</span>
          <span className="wc26-planner-promo-action">Open predictor →</span>
        </span>
      </Link>
    </div>
  );
}

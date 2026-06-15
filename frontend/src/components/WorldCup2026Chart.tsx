import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { Match, Team } from "../api/client";
import { CollapsibleChartPanel } from "./CollapsibleChartPanel";
import { WorldCup2026PlannerChart } from "./WorldCup2026PlannerChart";
import { WorldCup2026PredictionBracket } from "./WorldCup2026PredictionBracket";
import { WorldCup2026VenuesMap } from "./WorldCup2026VenuesMap";
import { WC26_PLANNER_HASH, WC26_PLANNER_VENUES } from "../utils/worldCup2026Planner";

export function WorldCup2026Chart({
  matches,
  teams,
}: {
  matches: Match[];
  teams: Team[];
}) {
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

  const location = useLocation();
  const openPlanner = location.hash === `#${WC26_PLANNER_HASH}`;

  useEffect(() => {
    if (!openPlanner) return;
    const timer = window.setTimeout(() => {
      document.getElementById("wc26-planner")?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [openPlanner]);

  return (
    <div className="wc26-chart-stack">
      <CollapsibleChartPanel
        title="Stadium locations"
        meta={`${WC26_PLANNER_VENUES.length} host cities`}
      >
        <WorldCup2026VenuesMap matches={matches} />
      </CollapsibleChartPanel>

      <CollapsibleChartPanel
        id="wc26-planner"
        title="World Cup planner"
        meta={groupStageMeta}
        forceOpen={openPlanner}
      >
        <WorldCup2026PlannerChart matches={matches} teams={teams} />
      </CollapsibleChartPanel>

      <CollapsibleChartPanel title="Knockout predictions" meta={knockoutMeta}>
        <WorldCup2026PredictionBracket matches={matches} teams={teams} />
      </CollapsibleChartPanel>
    </div>
  );
}

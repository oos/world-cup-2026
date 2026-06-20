import type { Match, Team } from "../api/client";
import {
  WorldCup2026PlannerChart,
  type WorldCup2026PlannerChartVariant,
} from "./WorldCup2026PlannerChart";

type WorldCup2026PlannerPanelProps = {
  matches: Match[];
  teams: Team[];
  id?: string;
  ariaLabel?: string;
  variant?: WorldCup2026PlannerChartVariant;
  showHistoricalDates?: boolean;
  onShowHistoricalDatesChange?: (show: boolean) => void;
};

export function WorldCup2026PlannerPanel({
  matches,
  teams,
  id = "schedule-planner",
  ariaLabel = "Schedule table",
  variant = "full",
  showHistoricalDates,
  onShowHistoricalDatesChange,
}: WorldCup2026PlannerPanelProps) {
  return (
    <div
      id={id}
      className="schedule-planner-panel"
      role="tabpanel"
      aria-label={ariaLabel}
    >
      <WorldCup2026PlannerChart
        matches={matches}
        teams={teams}
        variant={variant}
        showHistoricalDates={showHistoricalDates}
        onShowHistoricalDatesChange={onShowHistoricalDatesChange}
      />
    </div>
  );
}

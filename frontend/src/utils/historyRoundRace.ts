import type { HistoryMatch } from "../api/client";
import {
  ROUND_CATEGORIES,
  type RoundCategory,
  buildTeamRoundStats,
  computeSuccessScore,
} from "./historyRoundStats";

export type RoundRaceEntry = {
  team: string;
  total: number;
  successScore: number;
  rounds: Record<RoundCategory, number>;
};

export type RoundRaceFrame = {
  year: number;
  teams: RoundRaceEntry[];
};

export type RoundRaceTimeline = {
  frames: RoundRaceFrame[];
};

function toRaceEntry(
  team: string,
  rounds: Record<RoundCategory, number>
): RoundRaceEntry {
  return {
    team,
    total: ROUND_CATEGORIES.reduce((sum, round) => sum + rounds[round], 0),
    successScore: computeSuccessScore(rounds),
    rounds,
  };
}

export function getTournamentYears(matches: HistoryMatch[]): number[] {
  return [...new Set(matches.map((match) => match.year))].sort((a, b) => a - b);
}

export function buildRoundRaceTimeline(
  matches: HistoryMatch[],
  topTeams = 18
): RoundRaceTimeline | null {
  const years = getTournamentYears(matches);
  if (years.length === 0) return null;

  const frames: RoundRaceFrame[] = [];

  for (const year of years) {
    const cumulativeMatches = matches.filter((match) => match.year <= year);
    const stats = buildTeamRoundStats(cumulativeMatches);
    const teams = stats
      .map((entry) => toRaceEntry(entry.team, entry.rounds))
      .slice(0, topTeams);

    frames.push({ year, teams });
  }

  return { frames };
}

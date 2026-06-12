import type { HistoryMatch } from "../api/client";
import {
  ROUND_CATEGORIES,
  type RoundCategory,
  buildTeamRoundStats,
  computeSuccessScore,
} from "./historyRoundStats";

export type RoundRaceEntry = {
  team: string;
  teamFlagIso?: string | null;
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
  rounds: Record<RoundCategory, number>,
  teamFlagIso?: string | null
): RoundRaceEntry {
  return {
    team,
    teamFlagIso,
    total: ROUND_CATEGORIES.reduce((sum, round) => sum + rounds[round], 0),
    successScore: computeSuccessScore(rounds),
    rounds,
  };
}

function buildTeamFlagMap(matches: HistoryMatch[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of matches) {
    if (match.team1_flag_iso) map.set(match.team1, match.team1_flag_iso);
    if (match.team2_flag_iso) map.set(match.team2, match.team2_flag_iso);
  }
  return map;
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
    const flagMap = buildTeamFlagMap(cumulativeMatches);
    const teams = stats
      .map((entry) => toRaceEntry(entry.team, entry.rounds, flagMap.get(entry.team)))
      .slice(0, topTeams);

    frames.push({ year, teams });
  }

  return { frames };
}

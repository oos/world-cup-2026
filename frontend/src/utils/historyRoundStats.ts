import type { HistoryMatch } from "../api/client";
import { buildYearPodiumMap, isPlaceholderPodiumTeam } from "./historyPodium";
import { normalizeHistoryTeamName } from "./historyTeamNames";

export const ROUND_CATEGORIES = [
  "Group Stage",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Third Place",
  "2nd Place",
  "1st Place",
] as const;

export type RoundCategory = (typeof ROUND_CATEGORIES)[number];

export {
  FINISH_COLORS,
  HISTORY_CHART_PALETTE as PALETTE,
  ROUND_COLORS,
} from "./historyChartColors";

export function roundHatchClass(round: RoundCategory): string {
  const classes: Record<RoundCategory, string> = {
    "Group Stage": "chart-hatch chart-hatch--group-stage",
    "Round of 16": "chart-hatch chart-hatch--round-of-16",
    "Quarter-finals": "chart-hatch chart-hatch--quarter-finals",
    "Semi-finals": "chart-hatch chart-hatch--semi-finals",
    "Third Place": "chart-hatch chart-hatch--third-place",
    "2nd Place": "chart-hatch chart-hatch--runner-up",
    "1st Place": "chart-hatch chart-hatch--champion",
  };
  return classes[round];
}

export function finishHatchClass(finish: string): string {
  const classes: Record<string, string> = {
    Champions: "chart-hatch chart-hatch--champion",
    "Runners-up": "chart-hatch chart-hatch--runner-up",
    "Third place": "chart-hatch chart-hatch--third-place-finish",
    "Fourth place": "chart-hatch chart-hatch--fourth-place",
    "Semi-finals": "chart-hatch chart-hatch--semi-finals-finish",
    "Quarter-finals": "chart-hatch chart-hatch--quarter-finals-finish",
    "Round of 16": "chart-hatch chart-hatch--round-of-16-finish",
    "Group Stage": "chart-hatch chart-hatch--group-stage",
  };
  return classes[finish] ?? "chart-hatch chart-hatch--group-stage";
}

export const ROUND_RANK: Record<RoundCategory, number> = {
  "Group Stage": 1,
  "Round of 16": 2,
  "Quarter-finals": 3,
  "Semi-finals": 4,
  "Third Place": 8,
  "2nd Place": 16,
  "1st Place": 50,
};

export function compareTeamSuccess(
  a: { name: string; successScore: number; rounds?: Record<RoundCategory, number> },
  b: { name: string; successScore: number; rounds?: Record<RoundCategory, number> }
): number {
  const scoreDiff = b.successScore - a.successScore;
  if (scoreDiff !== 0) return scoreDiff;

  const aRounds = a.rounds;
  const bRounds = b.rounds;
  if (aRounds && bRounds) {
    const firstDiff = bRounds["1st Place"] - aRounds["1st Place"];
    if (firstDiff !== 0) return firstDiff;
    const secondDiff = bRounds["2nd Place"] - aRounds["2nd Place"];
    if (secondDiff !== 0) return secondDiff;
    const thirdDiff = bRounds["Third Place"] - aRounds["Third Place"];
    if (thirdDiff !== 0) return thirdDiff;
  }

  return a.name.localeCompare(b.name);
}

export function computeSuccessScore(rounds: Record<RoundCategory, number>): number {
  return ROUND_CATEGORIES.reduce(
    (sum, round) => sum + rounds[round] * ROUND_RANK[round],
    0
  );
}

export type TeamRoundStats = {
  team: string;
  total: number;
  rounds: Record<RoundCategory, number>;
};

export function isFinalRound(round: string): boolean {
  const value = round.toLowerCase();
  return value === "final" || value === "final round";
}

export function getHistoryMatchWinner(match: HistoryMatch): string | null {
  const score = match.score;
  if (!score?.ft || score.ft.length < 2) return null;

  const pens = score.pens ?? score.p;
  if (pens && pens.length >= 2) {
    if (pens[0] > pens[1]) return match.team1;
    if (pens[1] > pens[0]) return match.team2;
    return null;
  }

  const deciding = score.et && score.et.length >= 2 ? score.et : score.ft;
  if (deciding[0] > deciding[1]) return match.team1;
  if (deciding[1] > deciding[0]) return match.team2;
  return null;
}

export function getHistoryMatchLoser(match: HistoryMatch): string | null {
  const winner = getHistoryMatchWinner(match);
  if (!winner) return null;
  return winner === match.team1 ? match.team2 : match.team1;
}

export function normalizeRound(round: string): RoundCategory {
  const value = round.toLowerCase();

  if (
    value.includes("third") ||
    value.includes("3rd") ||
    value === "match for third place"
  ) {
    return "Third Place";
  }
  if (value.includes("semi")) {
    return "Semi-finals";
  }
  if (value.includes("quarter")) {
    return "Quarter-finals";
  }
  if (value.includes("round of 16")) {
    return "Round of 16";
  }
  if (
    value.includes("matchday") ||
    value.includes("first round") ||
    value.includes("preliminary") ||
    value.includes("play-off") ||
    value.includes("playoff")
  ) {
    return "Group Stage";
  }

  return "Group Stage";
}

export function buildTeamRoundStats(matches: HistoryMatch[]): TeamRoundStats[] {
  const stats = new Map<string, Record<RoundCategory, number>>();

  const emptyRounds = (): Record<RoundCategory, number> =>
    Object.fromEntries(ROUND_CATEGORIES.map((round) => [round, 0])) as Record<
      RoundCategory,
      number
    >;

  for (const match of matches) {
    if (isFinalRound(match.round)) {
      continue;
    }

    const category = normalizeRound(match.round);
    for (const team of [match.team1, match.team2]) {
      if (!team) continue;
      const canonicalTeam = normalizeHistoryTeamName(team);
      const teamStats = stats.get(canonicalTeam) ?? emptyRounds();
      teamStats[category] += 1;
      stats.set(canonicalTeam, teamStats);
    }
  }

  for (const [, podium] of buildYearPodiumMap(matches)) {
    if (!isPlaceholderPodiumTeam(podium.first)) {
      const team = normalizeHistoryTeamName(podium.first);
      const teamStats = stats.get(team) ?? emptyRounds();
      teamStats["1st Place"] += 1;
      stats.set(team, teamStats);
    }
    if (!isPlaceholderPodiumTeam(podium.second)) {
      const team = normalizeHistoryTeamName(podium.second);
      const teamStats = stats.get(team) ?? emptyRounds();
      teamStats["2nd Place"] += 1;
      stats.set(team, teamStats);
    }
  }

  return [...stats.entries()]
    .map(([team, rounds]) => {
      const successScore = computeSuccessScore(rounds);
      return {
        team,
        rounds,
        total: ROUND_CATEGORIES.reduce((sum, round) => sum + rounds[round], 0),
        successScore,
      };
    })
    .sort((a, b) =>
      compareTeamSuccess(
        { name: a.team, successScore: a.successScore, rounds: a.rounds },
        { name: b.team, successScore: b.successScore, rounds: b.rounds }
      )
    );
}

import type { HistoryMatch } from "../api/client";
import {
  getHistoryMatchLoser,
  getHistoryMatchWinner,
  isFinalRound,
  normalizeRound,
} from "./historyRoundStats";

export type YearPodium = {
  first: string;
  second: string;
  third?: string;
  thirdNote?: string;
  thirdNoteAsterisk?: boolean;
};

const MANUAL_THIRD_PLACE: Record<
  number,
  { third: string; note: string; asterisk?: boolean }
> = {
  1930: {
    third: "United States",
    note: "No third-place match was played; the U.S. were awarded third on overall record.",
    asterisk: true,
  },
  1950: {
    third: "Sweden",
    note: "No third-place match; Sweden finished third in the final group.",
  },
};

export const UPCOMING_PODIUM_YEAR = 2026;

export const PLACEHOLDER_PODIUM: YearPodium = {
  first: "TBD",
  second: "TBD",
  third: "TBD",
};

export function isPlaceholderPodiumTeam(team: string) {
  return team.trim().toUpperCase() === "TBD";
}

function isValidTeam(name: string) {
  return Boolean(name) && !/^[WL]\d+$/i.test(name.trim());
}

function getFinalRoundMatches(matches: HistoryMatch[]): HistoryMatch[] {
  return matches.filter((match) => isFinalRound(match.round));
}

function getPodiumFromFinalGroup(
  finalMatches: HistoryMatch[]
): { first: string; second: string } | null {
  const points = new Map<string, number>();

  for (const match of finalMatches) {
    const winner = getHistoryMatchWinner(match);
    const loser = getHistoryMatchLoser(match);
    const team1 = match.team1;
    const team2 = match.team2;
    if (!team1 || !team2 || !isValidTeam(team1) || !isValidTeam(team2)) {
      continue;
    }

    if (winner && loser) {
      points.set(winner, (points.get(winner) ?? 0) + 2);
      points.set(loser, (points.get(loser) ?? 0) + 0);
      continue;
    }

    const score = match.score?.ft;
    if (score && score.length >= 2 && score[0] === score[1]) {
      points.set(team1, (points.get(team1) ?? 0) + 1);
      points.set(team2, (points.get(team2) ?? 0) + 1);
    }
  }

  const ranked = [...points.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  if (ranked.length < 2) {
    return null;
  }

  let firstTeam = ranked[0][0];
  let secondTeam = ranked[1][0];

  if (ranked[0][1] === ranked[1][1]) {
    const tiedPoints = ranked[0][1];
    const tiedTeams = ranked
      .filter(([, points]) => points === tiedPoints)
      .map(([team]) => team);
    const headToHeadWinner = resolveHeadToHeadWinner(tiedTeams, finalMatches);
    if (!headToHeadWinner) {
      return null;
    }
    firstTeam = headToHeadWinner;
    const resolvedSecond =
      ranked.find(([team, points]) => team !== firstTeam && points < tiedPoints)?.[0] ??
      ranked.find(([team]) => team !== firstTeam)?.[0];
    if (!resolvedSecond) {
      return null;
    }
    secondTeam = resolvedSecond;
  }

  return { first: firstTeam, second: secondTeam };
}

function resolveHeadToHeadWinner(
  tiedTeams: string[],
  finalMatches: HistoryMatch[]
): string | null {
  for (const match of finalMatches) {
    const team1 = match.team1;
    const team2 = match.team2;
    if (!tiedTeams.includes(team1) || !tiedTeams.includes(team2)) {
      continue;
    }
    const winner = getHistoryMatchWinner(match);
    if (winner && tiedTeams.includes(winner)) {
      return winner;
    }
  }
  return null;
}

export function getYearPodium(
  matches: HistoryMatch[],
  year: number
): YearPodium | null {
  const yearMatches = matches.filter((match) => match.year === year);
  const finalMatches = getFinalRoundMatches(yearMatches);
  const thirdPlaceMatch = yearMatches.find(
    (match) => normalizeRound(match.round) === "Third Place"
  );

  if (finalMatches.length === 0) return null;

  let first: string | null;
  let second: string | null;

  if (finalMatches.length === 1) {
    first = getHistoryMatchWinner(finalMatches[0]);
    second = getHistoryMatchLoser(finalMatches[0]);
  } else {
    const groupPodium = getPodiumFromFinalGroup(finalMatches);
    if (!groupPodium) return null;
    first = groupPodium.first;
    second = groupPodium.second;
  }

  if (!first || !second || !isValidTeam(first) || !isValidTeam(second)) {
    return null;
  }

  const thirdWinner = thirdPlaceMatch ? getHistoryMatchWinner(thirdPlaceMatch) : null;
  const podium: YearPodium = { first, second };
  if (thirdWinner && isValidTeam(thirdWinner)) {
    podium.third = thirdWinner;
  } else {
    const manualThird = MANUAL_THIRD_PLACE[year];
    if (manualThird) {
      podium.third = manualThird.third;
      podium.thirdNote = manualThird.note;
      podium.thirdNoteAsterisk = manualThird.asterisk ?? false;
    }
  }
  return podium;
}

export function buildYearPodiumMap(
  matches: HistoryMatch[]
): Map<number, YearPodium> {
  const years = [...new Set(matches.map((match) => match.year))];
  const podiums = new Map<number, YearPodium>();

  for (const year of years) {
    const podium = getYearPodium(matches, year);
    if (podium) podiums.set(year, podium);
  }

  return podiums;
}

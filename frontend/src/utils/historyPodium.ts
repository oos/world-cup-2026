import type { HistoryMatch } from "../api/client";
import { normalizeRound } from "./historyRoundStats";

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

function getMatchWinner(match: HistoryMatch): string | null {
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

function getMatchLoser(match: HistoryMatch): string | null {
  const winner = getMatchWinner(match);
  if (!winner) return null;
  return winner === match.team1 ? match.team2 : match.team1;
}

export function getYearPodium(
  matches: HistoryMatch[],
  year: number
): YearPodium | null {
  const yearMatches = matches.filter((match) => match.year === year);
  const finalMatch = yearMatches.find(
    (match) => normalizeRound(match.round) === "Final"
  );
  const thirdPlaceMatch = yearMatches.find(
    (match) => normalizeRound(match.round) === "Third Place"
  );

  if (!finalMatch) return null;

  const first = getMatchWinner(finalMatch);
  const second = getMatchLoser(finalMatch);
  if (!first || !second || !isValidTeam(first) || !isValidTeam(second)) {
    return null;
  }

  const thirdWinner = thirdPlaceMatch ? getMatchWinner(thirdPlaceMatch) : null;
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

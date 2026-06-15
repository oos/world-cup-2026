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

export function getYearPodium(
  matches: HistoryMatch[],
  year: number
): YearPodium | null {
  const yearMatches = matches.filter((match) => match.year === year);
  const finalMatch = yearMatches.find((match) => isFinalRound(match.round));
  const thirdPlaceMatch = yearMatches.find(
    (match) => normalizeRound(match.round) === "Third Place"
  );

  if (!finalMatch) return null;

  const first = getHistoryMatchWinner(finalMatch);
  const second = getHistoryMatchLoser(finalMatch);
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

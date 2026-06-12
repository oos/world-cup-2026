import type { Match } from "../api/client";
import { getMatchSortKey } from "./matchTime";

export type TournamentMilestone = {
  label: string;
  date: string;
  match: Match;
};

export type TournamentSummary = {
  startDate: string;
  endDate: string;
  openingMatch: Match | null;
  finalMatch: Match | null;
  matchCount: number;
};

function sortBySchedule(matches: Match[]): Match[] {
  return [...matches].sort(
    (a, b) => getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time)
  );
}

export function summarizeTournament(matches: Match[]): TournamentSummary {
  const dated = sortBySchedule(matches.filter((match) => match.date));
  const openingMatch = dated[0] ?? null;
  const finalMatch =
    [...dated].reverse().find((match) => match.round?.toLowerCase() === "final") ??
    dated[dated.length - 1] ??
    null;

  return {
    startDate: openingMatch?.date ?? "",
    endDate: finalMatch?.date ?? dated[dated.length - 1]?.date ?? "",
    openingMatch,
    finalMatch,
    matchCount: matches.length,
  };
}

export function formatTournamentDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "Dates TBC";

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth();

  const startLabel = start.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const endLabel = end.toLocaleDateString(undefined, {
    day: "numeric",
    month: sameMonth ? undefined : "long",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

export function formatLongDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

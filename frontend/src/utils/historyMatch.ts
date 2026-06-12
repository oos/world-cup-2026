import type { HistoryMatch } from "../api/client";

export function historyMatchSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";
}

export function historyMatchKey(
  match: Pick<HistoryMatch, "date" | "team1" | "team2">
): string {
  const teams = [match.team1, match.team2].sort((a, b) => a.localeCompare(b));
  return `${match.date ?? "unknown"}-${historyMatchSlug(teams[0])}-vs-${historyMatchSlug(teams[1])}`;
}

export function historyMatchCardId(year: number, matchKey: string): string {
  return `history-match-${year}-${matchKey}`;
}

export function historyMatchPath(year: number, matchKey: string): string {
  return `/history/${year}/${encodeURIComponent(matchKey)}`;
}

export function historyReturnPath(search: string, cardId: string): string {
  return `/history${search ? `?${search}` : ""}#${cardId}`;
}

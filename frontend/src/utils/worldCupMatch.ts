export function worldCupMatchKey(
  year: number,
  match: { match_key?: string; date?: string | null; opponent: string }
) {
  return (
    match.match_key ??
    `${year}-${match.date ?? "unknown"}-${match.opponent.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  );
}

export function worldCupMatchCardId(year: number, matchKey: string) {
  return `wc-match-${year}-${matchKey}`;
}

export function teamWorldCupMatchPath(
  teamId: number,
  year: number,
  matchKey: string
) {
  return `/teams/${teamId}/history/${year}/${matchKey}`;
}

export function teamStatsReturnPath(teamId: number, matchCardId: string) {
  return `/teams/${teamId}?year=2026#${matchCardId}`;
}

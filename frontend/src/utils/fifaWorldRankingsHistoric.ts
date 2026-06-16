import { normalizeHistoryTeamName } from "./historyTeamNames";

/**
 * FIFA/Coca-Cola World Ranking published before each World Cup kickoff.
 * Rankings were not published before the 1994 tournament.
 */
const FIFA_WORLD_RANKINGS_AT_WORLD_CUP: Record<number, Record<string, number>> = {
  1994: {
    Brazil: 1,
    Italy: 16,
  },
  1998: {
    Brazil: 1,
    France: 18,
  },
  2002: {
    Brazil: 2,
    Germany: 11,
  },
  2006: {
    Italy: 13,
    France: 8,
    Germany: 19,
  },
  2010: {
    Spain: 2,
    Netherlands: 4,
    Germany: 6,
  },
  2014: {
    Germany: 2,
    Argentina: 5,
    Netherlands: 15,
  },
  2018: {
    France: 7,
    Croatia: 20,
    Belgium: 3,
  },
  2022: {
    Argentina: 3,
    France: 4,
    Croatia: 12,
  },
};

export function getHistoricWorldRanking(year: number, teamName: string): number | null {
  const yearRanks = FIFA_WORLD_RANKINGS_AT_WORLD_CUP[year];
  if (!yearRanks) return null;

  const canonical = normalizeHistoryTeamName(teamName);
  return yearRanks[canonical] ?? null;
}

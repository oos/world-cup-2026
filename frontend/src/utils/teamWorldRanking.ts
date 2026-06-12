const FIFA_WORLD_RANKINGS_2026: Record<string, number> = {
  ARG: 1,
  ESP: 2,
  FRA: 3,
  ENG: 4,
  POR: 5,
  BRA: 6,
  MAR: 7,
  NED: 8,
  BEL: 9,
  GER: 10,
  CRO: 11,
  COL: 13,
  MEX: 14,
  SEN: 15,
  URU: 16,
  USA: 17,
  JPN: 18,
  SUI: 19,
  IRN: 20,
  DEN: 21,
  TUR: 22,
  ECU: 23,
  AUT: 24,
  KOR: 25,
  NGA: 26,
  AUS: 27,
  ALG: 28,
  EGY: 29,
  CAN: 30,
  NOR: 31,
  CIV: 33,
  PAN: 34,
  SWE: 38,
  CZE: 40,
  PAR: 41,
  SCO: 42,
  TUN: 45,
  COD: 46,
  UZB: 50,
  QAT: 56,
  IRQ: 57,
  RSA: 60,
  KSA: 61,
  JOR: 63,
  BIH: 64,
  CPV: 67,
  GHA: 73,
  CUW: 82,
  HAI: 83,
  NZL: 85,
};

export function getTeamWorldRanking(
  fifaCode?: string | null,
  explicitRanking?: number | null
): number | null {
  if (explicitRanking != null) return explicitRanking;
  if (!fifaCode) return null;
  return FIFA_WORLD_RANKINGS_2026[fifaCode.toUpperCase()] ?? null;
}

export function formatTeamWorldRanking(ranking: number): string {
  return `#${ranking}`;
}

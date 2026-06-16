export const TRENDING_SQUAD_CODES = [
  "ENG",
  "BRA",
  "GER",
  "ESP",
  "ARG",
  "POR",
  "FRA",
  "MEX",
] as const;

export type TrendingSquadCode = (typeof TRENDING_SQUAD_CODES)[number];

export const TRENDING_SQUAD_CODE_SET = new Set<string>(TRENDING_SQUAD_CODES);

export const TRENDING_SQUAD_LABELS: Record<TrendingSquadCode, string> = {
  ENG: "England",
  BRA: "Brazil",
  GER: "Germany",
  ESP: "Spain",
  ARG: "Argentina",
  POR: "Portugal",
  FRA: "France",
  MEX: "Mexico",
};

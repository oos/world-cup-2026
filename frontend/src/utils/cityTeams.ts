import { CITY_TIMEZONE_OPTIONS } from "./cityTimezones";

const CITY_TEAM_FIFA: Record<string, string> = {
  Amsterdam: "NED",
  Athens: "GRE",
  Auckland: "NZL",
  Bangkok: "THA",
  Barcelona: "ESP",
  Beijing: "CHN",
  Berlin: "GER",
  Bogotá: "COL",
  Brisbane: "AUS",
  "Buenos Aires": "ARG",
  Cairo: "EGY",
  "Cape Town": "RSA",
  Chicago: "USA",
  Dallas: "USA",
  Delhi: "IND",
  Denver: "USA",
  Dubai: "UAE",
  Dublin: "IRL",
  Helsinki: "FIN",
  "Hong Kong": "HKG",
  Houston: "USA",
  Istanbul: "TUR",
  Jakarta: "IDN",
  Johannesburg: "RSA",
  "Kuala Lumpur": "MAS",
  Lagos: "NGA",
  Lisbon: "POR",
  London: "ENG",
  "Los Angeles": "USA",
  Madrid: "ESP",
  Manila: "PHI",
  Melbourne: "AUS",
  "Mexico City": "MEX",
  Miami: "USA",
  Montreal: "CAN",
  Moscow: "RUS",
  Mumbai: "IND",
  Nairobi: "KEN",
  "New York": "USA",
  Oslo: "NOR",
  Paris: "FRA",
  Perth: "AUS",
  Prague: "CZE",
  Riyadh: "KSA",
  Rome: "ITA",
  "San Francisco": "USA",
  Santiago: "CHI",
  "São Paulo": "BRA",
  Seattle: "USA",
  Seoul: "KOR",
  Singapore: "SGP",
  Stockholm: "SWE",
  Sydney: "AUS",
  Tokyo: "JPN",
  Toronto: "CAN",
  Vancouver: "CAN",
  Vienna: "AUT",
  Warsaw: "POL",
  "Washington DC": "USA",
  Zurich: "SUI",
};

const FIFA_TEAM_DISPLAY_NAMES: Record<string, string> = {
  ALG: "Algeria",
  ARG: "Argentina",
  AUS: "Australia",
  AUT: "Austria",
  BEL: "Belgium",
  BIH: "Bosnia and Herzegovina",
  BRA: "Brazil",
  CAN: "Canada",
  CHI: "Chile",
  CHN: "China",
  COL: "Colombia",
  CPV: "Cape Verde",
  CRO: "Croatia",
  CZE: "Czech Republic",
  CUW: "Curaçao",
  COD: "DR Congo",
  ECU: "Ecuador",
  EGY: "Egypt",
  ENG: "England",
  ESP: "Spain",
  FIN: "Finland",
  FRA: "France",
  GER: "Germany",
  GHA: "Ghana",
  GRE: "Greece",
  HAI: "Haiti",
  HKG: "Hong Kong",
  IND: "India",
  IDN: "Indonesia",
  IRL: "Ireland",
  IRN: "Iran",
  IRQ: "Iraq",
  ITA: "Italy",
  JOR: "Jordan",
  JPN: "Japan",
  KEN: "Kenya",
  KOR: "Korea Republic",
  KSA: "Saudi Arabia",
  MAR: "Morocco",
  MAS: "Malaysia",
  MEX: "Mexico",
  NED: "Netherlands",
  NGA: "Nigeria",
  NOR: "Norway",
  NZL: "New Zealand",
  PAN: "Panama",
  PAR: "Paraguay",
  PHI: "Philippines",
  POL: "Poland",
  POR: "Portugal",
  QAT: "Qatar",
  RSA: "South Africa",
  RUS: "Russia",
  SCO: "Scotland",
  SEN: "Senegal",
  SGP: "Singapore",
  SUI: "Switzerland",
  SWE: "Sweden",
  THA: "Thailand",
  TUN: "Tunisia",
  TUR: "Türkiye",
  UAE: "United Arab Emirates",
  URU: "Uruguay",
  USA: "United States",
  UZB: "Uzbekistan",
};

for (const option of CITY_TIMEZONE_OPTIONS) {
  if (!(option.city in CITY_TEAM_FIFA)) {
    CITY_TEAM_FIFA[option.city] = "";
  }
}

export function getDefaultTeamFifaCodeForCity(city: string): string {
  if (!city) return "";
  return CITY_TEAM_FIFA[city] ?? "";
}

export function resolvePreferredTeamFifaCode(
  city: string,
  preferredTeamFifaCode = "",
): string {
  if (preferredTeamFifaCode) return preferredTeamFifaCode;
  return getDefaultTeamFifaCodeForCity(city);
}

export function toPreferredTeamPreference(
  city: string,
  selectedFifaCode: string,
): string {
  const cityDefault = getDefaultTeamFifaCodeForCity(city);
  if (cityDefault && selectedFifaCode === cityDefault) return "";
  if (!city && !selectedFifaCode) return "";
  return selectedFifaCode;
}

export function getTeamDisplayName(
  fifaCode: string,
  teamName?: string | null,
): string {
  if (teamName) return teamName;
  return FIFA_TEAM_DISPLAY_NAMES[fifaCode] ?? fifaCode;
}

export function formatPreferredTeamLabel(
  city: string,
  preferredTeamFifaCode: string,
  teamName?: string | null,
): string {
  const effectiveCode = resolvePreferredTeamFifaCode(city, preferredTeamFifaCode);
  if (!effectiveCode) return "Not set";

  const name = getTeamDisplayName(effectiveCode, teamName);
  const usesCityDefault =
    Boolean(city) &&
    !preferredTeamFifaCode &&
    Boolean(getDefaultTeamFifaCodeForCity(city));

  return usesCityDefault ? `${name} (city default)` : name;
}

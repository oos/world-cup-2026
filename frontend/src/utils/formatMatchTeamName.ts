const MATCH_CARD_TEAM_NAME_BY_FIFA: Record<string, string> = {
  USA: "USA",
  UAE: "UAE",
  KOR: "Korea",
  BIH: "Bosnia",
  COD: "Congo",
};

const MATCH_CARD_TEAM_NAME_BY_NAME: Record<string, string> = {
  "United States": "USA",
  "United States of America": "USA",
  "United Arab Emirates": "UAE",
  "Korea Republic": "Korea",
  "South Korea": "Korea",
  "Bosnia and Herzegovina": "Bosnia",
  "Bosnia-Herzegovina": "Bosnia",
  "Bosnia & Herzegovina": "Bosnia",
  "DR Congo": "Congo",
  "Democratic Republic of the Congo": "Congo",
  "Congo DR": "Congo",
};

export function formatMatchCardTeamName(
  name: string,
  fifaCode?: string | null,
): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "TBD") return trimmed;

  const code = fifaCode?.trim().toUpperCase();
  if (code && MATCH_CARD_TEAM_NAME_BY_FIFA[code]) {
    return MATCH_CARD_TEAM_NAME_BY_FIFA[code];
  }

  return MATCH_CARD_TEAM_NAME_BY_NAME[trimmed] ?? trimmed;
}

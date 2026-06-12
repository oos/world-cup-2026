const HISTORY_TEAM_ALIASES: Record<string, string> = {
  USA: "United States",
  "United States": "United States",
  Germany: "Germany",
  "West Germany": "Germany",
  "FR Germany": "Germany",
  "Czech Republic": "Czech Republic",
  Czechia: "Czech Republic",
  Czechoslovakia: "Czech Republic",
  Zaire: "DR Congo",
  "DR Congo": "DR Congo",
  "Congo DR": "DR Congo",
  "Democratic Republic of the Congo": "DR Congo",
  "South Korea": "South Korea",
  "Korea Republic": "South Korea",
  "Ivory Coast": "Côte d'Ivoire",
  "Cote d'Ivoire": "Côte d'Ivoire",
  "Côte d'Ivoire": "Côte d'Ivoire",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Bosnia and Herzegovina": "Bosnia and Herzegovina",
  "Bosnia & Herzegovina": "Bosnia and Herzegovina",
  "IR Iran": "Iran",
  Iran: "Iran",
  Holland: "Netherlands",
  Netherlands: "Netherlands",
  Türkiye: "Turkey",
  Turkiye: "Turkey",
  Turkey: "Turkey",
  "Cabo Verde": "Cape Verde",
  "Cape Verde": "Cape Verde",
  Curacao: "Curaçao",
  "Curaçao": "Curaçao",
};

export function normalizeHistoryTeamName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return HISTORY_TEAM_ALIASES[trimmed] ?? trimmed;
}

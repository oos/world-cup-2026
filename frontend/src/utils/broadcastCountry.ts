const CITY_TO_COUNTRY: Record<string, string> = {
  Amsterdam: "nl",
  Athens: "gr",
  Auckland: "nz",
  Bangkok: "th",
  Barcelona: "es",
  Beijing: "cn",
  Berlin: "de",
  Bogotá: "co",
  Brisbane: "au",
  "Buenos Aires": "ar",
  Cairo: "eg",
  "Cape Town": "za",
  Chicago: "us",
  Dallas: "us",
  Delhi: "in",
  Denver: "us",
  Dubai: "ae",
  Dublin: "ie",
  Helsinki: "fi",
  "Hong Kong": "hk",
  Houston: "us",
  Istanbul: "tr",
  Jakarta: "id",
  Johannesburg: "za",
  "Kuala Lumpur": "my",
  Lagos: "ng",
  Lisbon: "pt",
  London: "gb",
  "Los Angeles": "us",
  Madrid: "es",
  Manila: "ph",
  Melbourne: "au",
  "Mexico City": "mx",
  Miami: "us",
  Montreal: "ca",
  Moscow: "ru",
  Mumbai: "in",
  Nairobi: "ke",
  "New York": "us",
  Oslo: "no",
  Paris: "fr",
  Perth: "au",
  Prague: "cz",
  Riyadh: "sa",
  Rome: "it",
  "San Francisco": "us",
  Santiago: "cl",
  "São Paulo": "br",
  Seattle: "us",
  Seoul: "kr",
  Singapore: "sg",
  Stockholm: "se",
  Sydney: "au",
  Tokyo: "jp",
  Toronto: "ca",
  Vancouver: "ca",
  Vienna: "at",
  Warsaw: "pl",
  "Washington DC": "us",
  Zurich: "ch",
};

export function getBroadcastCountryForCity(city: string): string | null {
  return CITY_TO_COUNTRY[city] ?? null;
}

export function formatCoverageLabel(coverage: string | null | undefined): string | null {
  if (!coverage) return null;
  switch (coverage) {
    case "all_matches":
      return "All 104 matches";
    case "select_matches":
      return "Selected matches";
    default:
      return coverage.replace(/_/g, " ");
  }
}

export function formatBroadcasterType(type: string): string {
  switch (type) {
    case "streaming":
      return "Streaming";
    case "tv":
      return "TV";
    case "free":
      return "Free";
    default:
      return type;
  }
}

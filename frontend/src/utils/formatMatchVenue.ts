import { normalizePlannerVenue } from "./worldCup2026Planner";
import { WC26_STADIUM_BY_VENUE } from "./worldCup2026Stadiums";
import { worldCupHostCountry } from "./worldCupHostCountries";

export type MatchVenueInput =
  | {
      name?: string | null;
      city?: string | null;
      country?: string | null;
    }
  | string
  | null
  | undefined;

type VenueParts = {
  name: string;
  city: string | null;
  country: string | null;
};

const COUNTRY_CODE_NAMES: Record<string, string> = {
  us: "USA",
  ca: "Canada",
  mx: "Mexico",
  qa: "Qatar",
  ru: "Russia",
  br: "Brazil",
  za: "South Africa",
  de: "Germany",
  kr: "South Korea",
  jp: "Japan",
  fr: "France",
  it: "Italy",
  es: "Spain",
  ar: "Argentina",
  se: "Sweden",
  ch: "Switzerland",
  cl: "Chile",
  uy: "Uruguay",
  gb: "England",
  eng: "England",
};

function normalizeCountryName(country: string | null | undefined): string | null {
  if (!country) return null;
  const trimmed = country.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === "united states" || lower === "united states of america") {
    return "USA";
  }
  if (trimmed.length <= 3) {
    return COUNTRY_CODE_NAMES[lower] ?? trimmed;
  }
  return trimmed;
}

function lookupWc26Venue(
  name: string | null | undefined,
  city: string | null | undefined
): VenueParts | null {
  const venue = normalizePlannerVenue(name, city);
  if (!venue) return null;
  const stadium = WC26_STADIUM_BY_VENUE[venue];
  if (!stadium) return null;
  return {
    name: stadium.name,
    city: stadium.city,
    country: stadium.country,
  };
}

function resolveStructuredVenue(
  input: Exclude<MatchVenueInput, string | null | undefined>,
  year?: number | null
): VenueParts | null {
  const name = input.name?.trim() || null;
  const city = input.city?.trim() || null;
  const country = normalizeCountryName(input.country);

  if (!name && !city) return null;

  const lookup = lookupWc26Venue(name, city);
  if (lookup) {
    return lookup;
  }

  if (name && city && country) {
    return { name, city, country };
  }

  if (name && !city && !country && year === 2026) {
    const byCityOnly = lookupWc26Venue(name, name);
    if (byCityOnly) return byCityOnly;
  }

  const hostCountry = year ? worldCupHostCountry(year) : null;
  if (name && city) {
    return { name, city, country: country ?? hostCountry };
  }

  if (name && !city) {
    return { name, city: null, country: country ?? hostCountry };
  }

  return null;
}

function resolveStringVenue(value: string, year?: number | null): VenueParts | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lookup = lookupWc26Venue(trimmed, trimmed);
  if (lookup) return lookup;

  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return {
      name: parts.slice(0, -2).join(", "),
      city: parts[parts.length - 2] ?? null,
      country: normalizeCountryName(parts[parts.length - 1]),
    };
  }

  if (parts.length === 2) {
    const hostCountry = year ? worldCupHostCountry(year) : null;
    return {
      name: parts[0] ?? trimmed,
      city: parts[1] ?? null,
      country: hostCountry,
    };
  }

  const hostCountry = year ? worldCupHostCountry(year) : null;
  return {
    name: parts[0] ?? trimmed,
    city: null,
    country: hostCountry,
  };
}

function resolveVenueParts(
  venue: MatchVenueInput,
  year?: number | null
): VenueParts | null {
  if (!venue) return null;
  if (typeof venue === "string") {
    return resolveStringVenue(venue, year);
  }
  return resolveStructuredVenue(venue, year);
}

function joinVenueParts(parts: VenueParts): string {
  const country = normalizeCountryName(parts.country);
  const values = [parts.name, parts.city, country].filter(Boolean) as string[];
  const deduped = values.filter((value, index) => index === 0 || value !== values[index - 1]);
  return deduped.join(", ");
}

export function formatMatchVenue(
  venue: MatchVenueInput,
  options?: { year?: number | null }
): string | null {
  const parts = resolveVenueParts(venue, options?.year);
  if (!parts) return null;
  const label = joinVenueParts(parts);
  return label || null;
}

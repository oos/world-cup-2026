import type { PlannerVenue } from "./worldCup2026Planner";

export type StadiumVenue = {
  name: string;
  city: string;
  country: string;
};

export const WC26_STADIUM_BY_VENUE: Record<PlannerVenue, StadiumVenue> = {
  Vancouver: { name: "BC Place", city: "Vancouver", country: "Canada" },
  Toronto: { name: "BMO Field", city: "Toronto", country: "Canada" },
  Seattle: { name: "Lumen Field", city: "Seattle", country: "USA" },
  "San Francisco": {
    name: "Levi's Stadium",
    city: "San Francisco",
    country: "USA",
  },
  "Los Angeles": { name: "SoFi Stadium", city: "Los Angeles", country: "USA" },
  "Kansas City": {
    name: "Arrowhead Stadium",
    city: "Kansas City",
    country: "USA",
  },
  Dallas: { name: "AT&T Stadium", city: "Dallas", country: "USA" },
  Houston: { name: "NRG Stadium", city: "Houston", country: "USA" },
  Atlanta: {
    name: "Mercedes-Benz Stadium",
    city: "Atlanta",
    country: "USA",
  },
  Miami: { name: "Hard Rock Stadium", city: "Miami", country: "USA" },
  Philadelphia: {
    name: "Lincoln Financial Field",
    city: "Philadelphia",
    country: "USA",
  },
  "New York": {
    name: "MetLife Stadium",
    city: "New York",
    country: "USA",
  },
  Boston: { name: "Gillette Stadium", city: "Boston", country: "USA" },
  "Mexico City": {
    name: "Estadio Azteca",
    city: "Mexico City",
    country: "Mexico",
  },
  Guadalajara: {
    name: "Estadio Akron",
    city: "Guadalajara",
    country: "Mexico",
  },
  Monterrey: {
    name: "Estadio BBVA",
    city: "Monterrey",
    country: "Mexico",
  },
};

export const WC26_VENUE_COUNTRY_LABELS: Record<string, string> = {
  USA: "United States",
  Canada: "Canada",
  Mexico: "Mexico",
};

export const WC26_VENUE_COUNTRY_ORDER = [
  "United States",
  "Canada",
  "Mexico",
] as const;

export function groupVenuesByCountry(
  venues: readonly PlannerVenue[]
): { country: string; venues: PlannerVenue[] }[] {
  const grouped = new Map<string, PlannerVenue[]>();

  for (const venue of venues) {
    const countryKey = WC26_STADIUM_BY_VENUE[venue].country;
    const country = WC26_VENUE_COUNTRY_LABELS[countryKey] ?? countryKey;
    const list = grouped.get(country);
    if (list) {
      list.push(venue);
    } else {
      grouped.set(country, [venue]);
    }
  }

  return WC26_VENUE_COUNTRY_ORDER.filter((country) => grouped.has(country)).map(
    (country) => ({
      country,
      venues: grouped.get(country) ?? [],
    })
  );
}

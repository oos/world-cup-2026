import type { Match } from "../api/client";
import { getMatchSortKey } from "./matchTime";
import {
  normalizePlannerVenue,
  WC26_PLANNER_VENUES,
  type PlannerVenue,
} from "./worldCup2026Planner";

export const WC26_HOST_COUNTRIES = new Set([
  "United States of America",
  "Canada",
  "Mexico",
]);

export const WC26_VENUE_COORDINATES: Record<PlannerVenue, [number, number]> = {
  Vancouver: [-123.12, 49.28],
  Toronto: [-79.38, 43.65],
  Seattle: [-122.33, 47.61],
  "San Francisco": [-122.42, 37.77],
  "Los Angeles": [-118.24, 34.05],
  "Kansas City": [-94.58, 39.1],
  Dallas: [-96.8, 32.78],
  Houston: [-95.37, 29.76],
  Atlanta: [-84.39, 33.75],
  Miami: [-80.19, 25.76],
  Philadelphia: [-75.17, 39.95],
  "New York/New Jersey": [-74.01, 40.71],
  Boston: [-71.06, 42.36],
  "Mexico City": [-99.13, 19.43],
  Guadalajara: [-103.35, 20.67],
  Monterrey: [-100.32, 25.67],
};

export const WC26_VENUE_MAP_LABELS: Record<PlannerVenue, string> = {
  Vancouver: "Vancouver",
  Toronto: "Toronto",
  Seattle: "Seattle",
  "San Francisco": "San Francisco",
  "Los Angeles": "Los Angeles",
  "Kansas City": "Kansas City",
  Dallas: "Dallas",
  Houston: "Houston",
  Atlanta: "Atlanta",
  Miami: "Miami",
  Philadelphia: "Philadelphia",
  "New York/New Jersey": "New York",
  Boston: "Boston",
  "Mexico City": "Mexico City",
  Guadalajara: "Guadalajara",
  Monterrey: "Monterrey",
};

export function groupMatchesByVenue(matches: Match[]): Map<PlannerVenue, Match[]> {
  const grouped = new Map<PlannerVenue, Match[]>(
    WC26_PLANNER_VENUES.map((venue) => [venue, []])
  );

  for (const match of matches) {
    const venue = normalizePlannerVenue(match.stadium?.name, match.stadium?.city);
    if (!venue) continue;
    grouped.get(venue)?.push(match);
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time));
  }

  return grouped;
}

export function isHostCountry(name: string): boolean {
  return WC26_HOST_COUNTRIES.has(name);
}

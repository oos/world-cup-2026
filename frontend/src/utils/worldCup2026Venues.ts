import type { Match } from "../api/client";
import { getMatchSortKey } from "./matchTime";
import { summarizeTournament } from "./tournamentDates";
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
  "New York": [-74.01, 40.71],
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
  "New York": "New York",
  Boston: "Boston",
  "Mexico City": "Mexico City",
  Guadalajara: "Guadalajara",
  Monterrey: "Monterrey",
};

export type VenueMapLabelOffset = {
  dx: number;
  dy: number;
  anchor: "start" | "end" | "middle";
};

export const WC26_VENUE_MAP_LABEL_LINES: Partial<Record<PlannerVenue, string[]>> = {
  "San Francisco": ["San", "Francisco"],
  "Los Angeles": ["Los", "Angeles"],
  "Kansas City": ["Kansas", "City"],
  "New York": ["New", "York"],
  "Mexico City": ["Mexico", "City"],
};

export const WC26_VENUE_MAP_LABEL_OFFSETS: Record<PlannerVenue, VenueMapLabelOffset> = {
  Vancouver: { dx: 0, dy: -66, anchor: "middle" },
  Seattle: { dx: 94, dy: -22, anchor: "start" },
  "San Francisco": { dx: 94, dy: 18, anchor: "start" },
  "Los Angeles": { dx: 94, dy: 56, anchor: "start" },
  "Kansas City": { dx: 0, dy: -68, anchor: "middle" },
  Dallas: { dx: -94, dy: 34, anchor: "end" },
  Houston: { dx: 94, dy: 34, anchor: "start" },
  Atlanta: { dx: 0, dy: 70, anchor: "middle" },
  Miami: { dx: 94, dy: 10, anchor: "start" },
  Philadelphia: { dx: -94, dy: 32, anchor: "end" },
  "New York": { dx: -94, dy: -16, anchor: "end" },
  Boston: { dx: 94, dy: -34, anchor: "start" },
  Toronto: { dx: -94, dy: -40, anchor: "end" },
  "Mexico City": { dx: 0, dy: 74, anchor: "middle" },
  Guadalajara: { dx: -94, dy: 4, anchor: "end" },
  Monterrey: { dx: 94, dy: -30, anchor: "start" },
};

export function getVenueMapLabelOffset(venue: PlannerVenue): VenueMapLabelOffset {
  return WC26_VENUE_MAP_LABEL_OFFSETS[venue];
}

export function getVenueMapLabelLines(venue: PlannerVenue): string[] {
  return WC26_VENUE_MAP_LABEL_LINES[venue] ?? [WC26_VENUE_MAP_LABELS[venue]];
}

const LABEL_FONT_SIZE = 15;
const LABEL_FONT_SIZE_SELECTED = 17;
const LABEL_LINE_HEIGHT = 18;
const LABEL_CHAR_WIDTH = 8.6;

export function getVenueMapLabelMetrics(
  venue: PlannerVenue,
  isSelected: boolean
): {
  lines: string[];
  offset: VenueMapLabelOffset;
  fontSize: number;
  lineHeight: number;
  box: { x: number; y: number; width: number; height: number };
} {
  const lines = getVenueMapLabelLines(venue);
  const offset = getVenueMapLabelOffset(venue);
  const fontSize = isSelected ? LABEL_FONT_SIZE_SELECTED : LABEL_FONT_SIZE;
  const lineHeight = LABEL_LINE_HEIGHT;
  const width =
    Math.max(...lines.map((line) => line.length)) * LABEL_CHAR_WIDTH + 14;
  const height = lines.length * lineHeight + 8;
  const centerY = offset.dy - ((lines.length - 1) * lineHeight) / 2;

  let x = offset.dx;
  if (offset.anchor === "middle") {
    x -= width / 2;
  } else if (offset.anchor === "end") {
    x -= width;
  }

  return {
    lines,
    offset,
    fontSize,
    lineHeight,
    box: {
      x: x - 2,
      y: centerY - height / 2,
      width,
      height,
    },
  };
}

export function getVenueMapDisplayLabel(venue: PlannerVenue): string {
  return WC26_VENUE_MAP_LABELS[venue];
}

const WC26_MAP_CENTRAL_AMERICA_COUNTRIES = new Set([
  "Guatemala",
  "Belize",
  "Honduras",
  "El Salvador",
  "Nicaragua",
  "Costa Rica",
  "Panama",
  "Cuba",
  "Jamaica",
  "Haiti",
  "Dominican Rep.",
  "Bahamas",
  "Puerto Rico",
  "Trinidad and Tobago",
]);

export function getFinalPlannerVenue(matches: Match[]): PlannerVenue | null {
  const { finalMatch } = summarizeTournament(matches);
  if (!finalMatch) return null;

  return normalizePlannerVenue(finalMatch.stadium?.name, finalMatch.stadium?.city);
}

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

const WC26_MAP_HOST_COUNTRY_COLORS: Record<
  string,
  { fill: string; stroke: string; hoverFill: string }
> = {
  Canada: {
    fill: "#f7a816",
    stroke: "#c47a0f",
    hoverFill: "#f5930f",
  },
  Mexico: {
    fill: "#f9b233",
    stroke: "#d88912",
    hoverFill: "#f7a816",
  },
  "United States of America": {
    fill: "#f9b233",
    stroke: "#d88912",
    hoverFill: "#f7a816",
  },
};

export function getHostCountryMapColors(name: string): {
  fill: string;
  stroke: string;
  hoverFill: string;
} {
  if (!isHostCountry(name)) {
    if (WC26_MAP_CENTRAL_AMERICA_COUNTRIES.has(name)) {
      return { fill: "#93a4bc", stroke: "#7a8ea8", hoverFill: "#a3b2c8" };
    }

    return { fill: "#c5cedb", stroke: "#aab4c4", hoverFill: "#d0d8e3" };
  }

  return (
    WC26_MAP_HOST_COUNTRY_COLORS[name] ?? {
      fill: "#f9b233",
      stroke: "#d88912",
      hoverFill: "#f7a816",
    }
  );
}

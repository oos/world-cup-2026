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

export const WC26_VENUE_MAP_SHORT_LABELS: Record<PlannerVenue, string> = {
  Vancouver: "VAN",
  Toronto: "TOR",
  Seattle: "SEA",
  "San Francisco": "SFO",
  "Los Angeles": "LAX",
  "Kansas City": "MCI",
  Dallas: "DFW",
  Houston: "HOU",
  Atlanta: "ATL",
  Miami: "MIA",
  Philadelphia: "PHL",
  "New York": "NYC",
  Boston: "BOS",
  "Mexico City": "MEX",
  Guadalajara: "GDL",
  Monterrey: "MTY",
};

export type VenueMapLabelPlacement = {
  angleDeg: number;
  distance: number;
};

/** Label direction per city: 0° = right, 90° = down, 180° = left, 270° = up */
export const WC26_VENUE_MAP_LABEL_PLACEMENTS: Record<PlannerVenue, VenueMapLabelPlacement> = {
  Vancouver: { angleDeg: 35, distance: 36 },
  Seattle: { angleDeg: 350, distance: 36 },
  "San Francisco": { angleDeg: 70, distance: 38 },
  "Los Angeles": { angleDeg: 115, distance: 40 },
  "Kansas City": { angleDeg: 270, distance: 38 },
  Dallas: { angleDeg: 205, distance: 36 },
  Houston: { angleDeg: 40, distance: 36 },
  Atlanta: { angleDeg: 95, distance: 38 },
  Miami: { angleDeg: 55, distance: 38 },
  Philadelphia: { angleDeg: 225, distance: 36 },
  "New York": { angleDeg: 310, distance: 38 },
  Boston: { angleDeg: 25, distance: 38 },
  Toronto: { angleDeg: 295, distance: 40 },
  "Mexico City": { angleDeg: 90, distance: 40 },
  Guadalajara: { angleDeg: 175, distance: 36 },
  Monterrey: { angleDeg: 345, distance: 38 },
};

export type VenueMapLabelOffset = {
  dx: number;
  dy: number;
  anchor: "start" | "end" | "middle";
};

function placementToOffset({ angleDeg, distance }: VenueMapLabelPlacement): VenueMapLabelOffset {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad) * distance;
  const dy = Math.sin(rad) * distance;

  let anchor: VenueMapLabelOffset["anchor"] = "middle";
  if (dx > 10) anchor = "start";
  else if (dx < -10) anchor = "end";

  return { dx, dy, anchor };
}

export function getVenueMapLabelPlacement(venue: PlannerVenue): VenueMapLabelPlacement {
  return WC26_VENUE_MAP_LABEL_PLACEMENTS[venue];
}

export function getVenueMapLabelOffset(venue: PlannerVenue): VenueMapLabelOffset {
  return placementToOffset(getVenueMapLabelPlacement(venue));
}

export function getVenueMapLabelLines(venue: PlannerVenue, isSelected: boolean): string[] {
  const label = isSelected
    ? WC26_VENUE_MAP_LABELS[venue]
    : WC26_VENUE_MAP_SHORT_LABELS[venue];
  return [label];
}

const LABEL_FONT_SIZE = 11;
const LABEL_FONT_SIZE_SELECTED = 12;
const LABEL_LINE_HEIGHT = 14;
const LABEL_CHAR_WIDTH = 6.8;
const LABEL_PAD_X = 8;
const LABEL_PAD_Y = 5;

export function getVenueMapLabelMetrics(
  venue: PlannerVenue,
  isSelected: boolean
): {
  lines: string[];
  offset: VenueMapLabelOffset;
  placement: VenueMapLabelPlacement;
  fontSize: number;
  lineHeight: number;
  box: { x: number; y: number; width: number; height: number };
  leader: { x1: number; y1: number; x2: number; y2: number };
} {
  const lines = getVenueMapLabelLines(venue, isSelected);
  const placement = getVenueMapLabelPlacement(venue);
  const offset = placementToOffset(placement);
  const fontSize = isSelected ? LABEL_FONT_SIZE_SELECTED : LABEL_FONT_SIZE;
  const lineHeight = LABEL_LINE_HEIGHT;
  const width = Math.max(...lines.map((line) => line.length)) * LABEL_CHAR_WIDTH + LABEL_PAD_X * 2;
  const height = lines.length * lineHeight + LABEL_PAD_Y * 2;
  const centerY = offset.dy - ((lines.length - 1) * lineHeight) / 2;

  let x = offset.dx;
  if (offset.anchor === "middle") {
    x -= width / 2;
  } else if (offset.anchor === "end") {
    x -= width;
  }

  const pinRadius = isSelected ? 22 : 18;
  const leaderStart = pinRadius + 2;
  const rad = (placement.angleDeg * Math.PI) / 180;

  return {
    lines,
    offset,
    placement,
    fontSize,
    lineHeight,
    box: {
      x,
      y: centerY - height / 2,
      width,
      height,
    },
    leader: {
      x1: Math.cos(rad) * leaderStart,
      y1: Math.sin(rad) * leaderStart,
      x2: Math.cos(rad) * (placement.distance - 4),
      y2: Math.sin(rad) * (placement.distance - 4),
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

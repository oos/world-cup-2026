import type { Location } from "react-router-dom";
import type { Match, Team } from "../api/client";
import { WC_2026_PATH } from "../config/appNav";
import {
  type GroupColor,
  WC26_GROUP_COLORS,
} from "../theme/plannerColors";

export type { GroupColor };
export { WC26_GROUP_COLORS };

export const WC26_PLANNER_VENUES = [
  "Atlanta",
  "Boston",
  "Dallas",
  "Houston",
  "Kansas City",
  "Los Angeles",
  "Miami",
  "New York/New Jersey",
  "Philadelphia",
  "San Francisco",
  "Seattle",
  "Guadalajara",
  "Mexico City",
  "Monterrey",
  "Toronto",
  "Vancouver",
] as const;

export type PlannerVenue = (typeof WC26_PLANNER_VENUES)[number];

export const WC26_PLANNER_HASH = "planner";
export const WC26_PLANNER_DATE_PARAM = "plannerDate";
export const WC26_PLANNER_VENUE_PARAM = "plannerVenue";

export function plannerDomId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function plannerDateElementId(date: string): string {
  return `wc26-planner-date-${date}`;
}

export function plannerCellElementId(venue: PlannerVenue, date: string): string {
  return `wc26-planner-cell-${plannerDomId(venue)}-${date}`;
}

export function buildPlannerReturnPath(
  location: Pick<Location, "pathname" | "search">,
  date: string,
  venue?: PlannerVenue,
): string {
  const params = new URLSearchParams(location.search);
  params.set(WC26_PLANNER_DATE_PARAM, date);
  if (venue) params.set(WC26_PLANNER_VENUE_PARAM, venue);
  else params.delete(WC26_PLANNER_VENUE_PARAM);
  const search = params.toString();
  const pathname = location.pathname || WC_2026_PATH;
  return `${pathname}${search ? `?${search}` : ""}#${WC26_PLANNER_HASH}`;
}

export function parsePlannerVenueParam(value: string | null): PlannerVenue | null {
  if (!value) return null;
  return WC26_PLANNER_VENUES.includes(value as PlannerVenue)
    ? (value as PlannerVenue)
    : null;
}

const VENUE_ALIASES: Record<string, PlannerVenue> = {
  atlanta: "Atlanta",
  boston: "Boston",
  foxborough: "Boston",
  dallas: "Dallas",
  arlington: "Dallas",
  houston: "Houston",
  "kansas city": "Kansas City",
  "los angeles": "Los Angeles",
  inglewood: "Los Angeles",
  miami: "Miami",
  "miami gardens": "Miami",
  "new york": "New York/New Jersey",
  "new jersey": "New York/New Jersey",
  rutherford: "New York/New Jersey",
  philadelphia: "Philadelphia",
  "san francisco": "San Francisco",
  "san francisco bay area": "San Francisco",
  "santa clara": "San Francisco",
  seattle: "Seattle",
  guadalajara: "Guadalajara",
  zapopan: "Guadalajara",
  "mexico city": "Mexico City",
  monterrey: "Monterrey",
  guadalupe: "Monterrey",
  toronto: "Toronto",
  vancouver: "Vancouver",
};

export function groupLetterFromLabel(group: string | null | undefined): string | null {
  if (!group) return null;
  const match = group.match(/Group\s+([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

export function normalizePlannerVenue(
  stadiumName: string | null | undefined,
  city: string | null | undefined
): PlannerVenue | null {
  const candidates = [stadiumName, city].filter(Boolean) as string[];
  for (const value of candidates) {
    const lower = value.toLowerCase();
    for (const [alias, venue] of Object.entries(VENUE_ALIASES)) {
      if (lower.includes(alias)) {
        return venue;
      }
    }
  }
  return null;
}

export function formatPlannerDateLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat(undefined, { month: "long" }).format(
    new Date(2026, month - 1, day)
  );
  return `${day} ${monthName}`;
}

export function formatPlannerKickoff(time: string | null | undefined): string | null {
  if (!time) return null;

  const utcMatch = time.match(/^(\d{1,2}):(\d{2})\s+UTC/);
  if (utcMatch) {
    const hours = Number(utcMatch[1]);
    const minutes = Number(utcMatch[2]);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return minutes === 0
      ? `${hour12}${period}`
      : `${hour12}:${String(minutes).padStart(2, "0")}${period}`;
  }

  const simple = time.match(/^(\d{1,2}):(\d{2})$/);
  if (simple) {
    const hours = Number(simple[1]);
    const minutes = Number(simple[2]);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return minutes === 0
      ? `${hour12}${period}`
      : `${hour12}:${String(minutes).padStart(2, "0")}${period}`;
  }

  return time;
}

export function formatPlannerMatchup(match: Match): string {
  const team1 = match.team1?.fifa_code ?? match.team1?.name ?? "TBD";
  const team2 = match.team2?.fifa_code ?? match.team2?.name ?? "TBD";
  return `${team1} vs ${team2}`;
}

export type PlannerMatchCell = {
  match: Match;
  venue: PlannerVenue;
  date: string;
  groupLetter: string;
  matchup: string;
  kickoff: string | null;
  score: string | null;
  colors: GroupColor;
};

export type PlannerGroupLegend = {
  letter: string;
  label: string;
  colors: GroupColor;
  teams: Team[];
};

export function buildPlannerGrid(matches: Match[], teams: Team[]) {
  const groupStageMatches = matches.filter(
    (match) => match.round?.startsWith("Matchday") && match.date && match.stadium
  );

  const dates = [...new Set(groupStageMatches.map((match) => match.date!))].sort();
  const cells = new Map<string, PlannerMatchCell>();

  for (const match of groupStageMatches) {
    const venue = normalizePlannerVenue(match.stadium?.name, match.stadium?.city);
    const groupLetter = groupLetterFromLabel(match.group);
    if (!venue || !groupLetter || !match.date) continue;

    const colors = WC26_GROUP_COLORS[groupLetter] ?? WC26_GROUP_COLORS.A;
    const ft = match.score?.ft;
    cells.set(`${venue}|${match.date}`, {
      match,
      venue,
      date: match.date,
      groupLetter,
      matchup: formatPlannerMatchup(match),
      kickoff: formatPlannerKickoff(match.time),
      score: ft ? `${ft[0]}-${ft[1]}` : null,
      colors,
    });
  }

  const legend: PlannerGroupLegend[] = Array.from(
    teams.reduce<Map<string, Team[]>>((groups, team) => {
      const letter = groupLetterFromLabel(team.group);
      if (!letter) return groups;
      const existing = groups.get(letter) ?? [];
      existing.push(team);
      groups.set(letter, existing);
      return groups;
    }, new Map())
  )
    .map(([letter, groupTeams]) => ({
      letter,
      label: `Group ${letter}`,
      colors: WC26_GROUP_COLORS[letter] ?? WC26_GROUP_COLORS.A,
      teams: groupTeams.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.letter.localeCompare(b.letter));

  return { dates, cells, legend };
}

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
  "New York",
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
export const SCHEDULE_VIEW_PARAM = "view";
export const SCHEDULE_TABLE_VIEW = "table";
export const SCHEDULE_LIST_VIEW = "list";

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

  const pathname = location.pathname || WC_2026_PATH;

  if (pathname === "/schedule") {
    if (!params.get("year")) params.set("year", "2026");
    params.set(SCHEDULE_VIEW_PARAM, SCHEDULE_TABLE_VIEW);
    return `/schedule?${params.toString()}`;
  }

  if (pathname === "/groups") {
    params.set(SCHEDULE_VIEW_PARAM, SCHEDULE_TABLE_VIEW);
    return `/groups?${params.toString()}`;
  }

  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ""}#${WC26_PLANNER_HASH}`;
}

export function parsePlannerVenueParam(value: string | null): PlannerVenue | null {
  if (!value) return null;
  if (value === "New York/New Jersey") return "New York";
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
  "new york": "New York",
  "new jersey": "New York",
  rutherford: "New York",
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

export function getPlannerDateParts(isoDate: string): { day: number; month: string } {
  const [, month, day] = isoDate.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat(undefined, { month: "long" }).format(
    new Date(2026, month - 1, day)
  );
  return { day, month: monthName };
}

export function formatPlannerDateLabel(isoDate: string): string {
  const { day, month } = getPlannerDateParts(isoDate);
  return `${day} ${month}`;
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

export function getPlannerTeamName(team: Match["team1"]): string {
  return team?.name ?? "TBD";
}

export const PLANNER_TEAM_NAME_MAX_LENGTH = 14;

export function formatPlannerTeamDisplayName(name: string): string {
  return name.replace(/\s+and\s+/gi, " & ");
}

export function truncatePlannerTeamName(
  name: string,
  maxLength = PLANNER_TEAM_NAME_MAX_LENGTH
): string {
  const displayName = formatPlannerTeamDisplayName(name);
  if (displayName.length <= maxLength) return displayName;
  return `${displayName.slice(0, maxLength - 1)}…`;
}

export function formatPlannerMatchupLabel(team1Name: string, team2Name: string): string {
  return `${team1Name} v ${team2Name}`;
}

export function formatPlannerMatchup(match: Match): string {
  return formatPlannerMatchupLabel(
    getPlannerTeamName(match.team1),
    getPlannerTeamName(match.team2)
  );
}

export type PlannerMatchCell = {
  match: Match;
  venue: PlannerVenue;
  date: string;
  groupLetter: string;
  team1Name: string;
  team2Name: string;
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
    const team1Name = getPlannerTeamName(match.team1);
    const team2Name = getPlannerTeamName(match.team2);
    cells.set(`${venue}|${match.date}`, {
      match,
      venue,
      date: match.date,
      groupLetter,
      team1Name,
      team2Name,
      matchup: formatPlannerMatchupLabel(team1Name, team2Name),
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

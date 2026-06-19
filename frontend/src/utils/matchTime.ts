import type { MatchScore } from "../api/client";

const MATCH_TIME_RE = /^(\d{1,2}):(\d{2})\s+UTC([+-])(\d{1,2})(?::(\d{2}))?$/;

export function parseMatchDateTime(date: string, time: string | null): Date | null {
  if (!date) return null;

  if (!time) {
    return new Date(`${date}T12:00:00Z`);
  }

  const match = time.match(MATCH_TIME_RE);
  if (!match) {
    const simple = time.match(/^(\d{1,2}):(\d{2})$/);
    if (simple) {
      return new Date(
        `${date}T${simple[1].padStart(2, "0")}:${simple[2]}:00Z`
      );
    }
    return new Date(`${date}T12:00:00Z`);
  }

  const [, hours, minutes, sign, offsetHours, offsetMinutes] = match;
  const offset = `${sign}${offsetHours.padStart(2, "0")}:${(offsetMinutes ?? "00").padStart(2, "0")}`;
  return new Date(`${date}T${hours.padStart(2, "0")}:${minutes}:00${offset}`);
}

export function getMatchLocalDate(
  date: string | null,
  time: string | null,
  timeZone: string
): string | null {
  if (!date) return null;
  if (!time) return date;

  const instant = parseMatchDateTime(date, time);
  if (!instant) return date;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function formatMatchLocalTime(
  date: string | null,
  time: string | null,
  timeZone: string
): string | null {
  if (!date || !time) return null;

  const instant = parseMatchDateTime(date, time);
  if (!instant) return time;

  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(instant);
}

export function formatMatchLocalDate(
  date: string | null,
  time: string | null,
  timeZone: string
): string | null {
  if (!date) return null;

  const instant = parseMatchDateTime(date, time) ?? new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(instant);
}

export function getMatchSortKey(date: string | null, time: string | null): number {
  const instant = date ? parseMatchDateTime(date, time) : null;
  return instant?.getTime() ?? 0;
}

export function getTodayLocalDate(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addLocalDateDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function getTomorrowLocalDate(timeZone: string): string {
  return addLocalDateDays(getTodayLocalDate(timeZone), 1);
}

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayOffset(fromIso: string, toIso: string): number {
  const msPerDay = 86_400_000;
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / msPerDay);
}

export function formatDateHeading(isoDate: string, todayIso: string): string {
  const formatted = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseIsoDate(isoDate));

  const offset = dayOffset(todayIso, isoDate);
  if (offset === 0) return `Today · ${formatted}`;
  if (offset === 1) return `Tomorrow · ${formatted}`;
  if (offset === -1) return `Yesterday · ${formatted}`;
  return formatted;
}

export function isMatchdayRound(round: string | null | undefined): boolean {
  return Boolean(round?.startsWith("Matchday"));
}

function parseMatchdayNumber(round: string): number {
  const match = round.match(/Matchday\s+(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function uniqueMatchdayLabels(
  matches: { round?: string | null }[],
): string[] {
  return [
    ...new Set(
      matches
        .map((match) => match.round)
        .filter((round): round is string => isMatchdayRound(round)),
    ),
  ].sort((a, b) => parseMatchdayNumber(a) - parseMatchdayNumber(b));
}

export function getDayMatchday(
  matches: { date?: string | null; round?: string | null }[],
  localDate: string,
): string | null {
  const nativeMatches = matches.filter((match) => match.date === localDate);
  const labels = uniqueMatchdayLabels(
    nativeMatches.length > 0 ? nativeMatches : matches,
  );

  if (labels.length === 0) return null;
  return labels[0];
}

export function formatScheduleDayHeading(
  isoDate: string,
  todayIso: string,
  matches: { date?: string | null; round?: string | null }[] = [],
): string {
  const heading = formatDateHeading(isoDate, todayIso);
  const matchday = getDayMatchday(matches, isoDate);
  return matchday ? `${heading} · ${matchday}` : heading;
}

export function isMatchPast(date: string | null, time: string | null): boolean {
  const instant = date ? parseMatchDateTime(date, time) : null;
  if (!instant) return false;
  return instant.getTime() < Date.now();
}

export const MATCH_IN_PLAY_WINDOW_MS = 2.5 * 60 * 60 * 1000;

const FINAL_LIVE_PERIODS = new Set(["FT", "AET", "PEN", "POST"]);
const NON_RUNNING_PERIODS = new Set(["HT", "BT", "FT", "AET", "PEN", "POST"]);

function extrapolateLiveMinute(
  live: NonNullable<MatchScore["live"]>,
  now = Date.now(),
): number | null {
  if (live.minute == null) return null;

  const period = live.period?.toUpperCase();
  if (period && NON_RUNNING_PERIODS.has(period)) return live.minute;
  if (live.added != null && live.added > 0) return live.minute;
  if (live.state !== "in" || !live.updatedAt) return live.minute;

  const syncedAt = Date.parse(live.updatedAt);
  if (Number.isNaN(syncedAt)) return live.minute;

  const elapsedMinutes = Math.floor((now - syncedAt) / 60_000);
  if (elapsedMinutes <= 0) return live.minute;

  return live.minute + Math.min(elapsedMinutes, 2);
}

function formatRunningLiveClock(
  live: NonNullable<MatchScore["live"]>,
  now = Date.now(),
): string | null {
  const period = live.period?.toUpperCase();
  if (period === "HT") return "Half-time";
  if (period === "BT") return "Break";
  if (period === "P" || period === "PEN") return "Penalties";

  const minute = extrapolateLiveMinute(live, now);
  const added = live.added;

  if (minute != null) {
    if (added != null && added > 0) {
      if (period === "ET" || period === "ET1" || period === "ET2") {
        return `ET ${minute}'+${added}`;
      }
      return `${minute}'+${added}`;
    }
    if (period === "ET" || period === "ET1" || period === "ET2") {
      return `ET ${minute}'`;
    }
    return `${minute}'`;
  }

  if (period === "ET" || period === "ET1" || period === "ET2") return "Extra time";
  return null;
}

/** True for numeric in-play clocks (e.g. 47', 90'+3); false for phase labels (Half-time, etc.). */
export function isProminentLiveClock(display: string | null | undefined): boolean {
  if (!display) return false;
  const normalized = display.trim();
  if (/^(half-?time|break|penalties|extra time|live)$/i.test(normalized)) {
    return false;
  }
  return /\d/.test(normalized);
}

export type LiveClockTone = "normal" | "added-time" | "extra-time";

const EXTRA_TIME_PERIODS = new Set(["ET", "ET1", "ET2"]);

export function getLiveClockTone(
  score: MatchScore | null | undefined,
): LiveClockTone {
  const live = score?.live;
  if (!live) return "normal";

  const period = live.period?.toUpperCase();
  if (period && EXTRA_TIME_PERIODS.has(period)) {
    return "extra-time";
  }

  if (live.added != null && live.added > 0) {
    return "added-time";
  }

  const display = (live.display ?? "").trim();
  if (/^ET\b/i.test(display)) return "extra-time";
  if (/'\s*\+|\+\d/.test(display)) return "added-time";

  return "normal";
}

export function formatMatchLiveClock(
  score: MatchScore | null | undefined,
  now = Date.now(),
): string | null {
  const live = score?.live;
  if (!live) return null;

  const period = live.period?.toUpperCase();
  if (period && FINAL_LIVE_PERIODS.has(period)) {
    return period === "AET" ? "AET" : period === "PEN" ? "PEN" : "FT";
  }

  const runningClock = formatRunningLiveClock(live, now);
  if (runningClock) return runningClock;

  if (live.display) return live.display;
  return null;
}

export function formatMatchStatusLabel(
  score: MatchScore | null | undefined,
  fallbackTime: string | null | undefined,
  date: string | null = null,
  time: string | null = null,
  now = Date.now(),
): string | null {
  if (isMatchComplete(score)) return "FT";
  if (isMatchInPlay(date, time, score)) {
    return formatMatchLiveClock(score, now) ?? "Live";
  }
  return fallbackTime ?? null;
}

export function isMatchComplete(score: MatchScore | null | undefined): boolean {
  if (!score) return false;

  const live = score.live;
  if (live?.state === "in") {
    const period = live.period?.toUpperCase();
    if (!period || !FINAL_LIVE_PERIODS.has(period)) {
      return false;
    }
  }

  if (score.final) return true;
  if (live?.state === "post") return true;

  const period = live?.period?.toUpperCase();
  if (period != null && FINAL_LIVE_PERIODS.has(period)) return true;

  const display = live?.display?.trim().toUpperCase();
  if (display === "FT" || display === "FULL TIME") return true;

  // Fallback when sync lag leaves second-half injury time frozen after the whistle.
  if (
    score.ft &&
    live?.period === "2H" &&
    live.minute != null &&
    live.minute >= 90 &&
    live.updatedAt
  ) {
    const syncedAt = Date.parse(live.updatedAt);
    if (!Number.isNaN(syncedAt) && Date.now() - syncedAt > 2 * 60_000) {
      return true;
    }
  }

  return false;
}

export function isMatchInPlay(
  date: string | null,
  time: string | null,
  score: MatchScore | null | undefined,
): boolean {
  if (isMatchComplete(score)) return false;

  const live = score?.live;
  if (live?.state === "in") return true;
  const period = live?.period?.toUpperCase();
  if (period && !FINAL_LIVE_PERIODS.has(period)) return true;

  const kickoff = date ? parseMatchDateTime(date, time) : null;
  if (!kickoff) return false;
  const now = Date.now();
  const kickoffMs = kickoff.getTime();
  return kickoffMs <= now && now < kickoffMs + MATCH_IN_PLAY_WINDOW_MS;
}

export function getScrollTargetDate(dates: string[], todayIso: string): string | undefined {
  if (dates.length === 0) return undefined;
  if (dates.includes(todayIso)) return todayIso;

  const futureDate = dates.find((date) => date >= todayIso);
  if (futureDate) return futureDate;

  return dates[dates.length - 1];
}

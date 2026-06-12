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

export function isMatchPast(date: string | null, time: string | null): boolean {
  const instant = date ? parseMatchDateTime(date, time) : null;
  if (!instant) return false;
  return instant.getTime() < Date.now();
}

export function getScrollTargetDate(dates: string[], todayIso: string): string | undefined {
  if (dates.length === 0) return undefined;
  if (dates.includes(todayIso)) return todayIso;

  const futureDate = dates.find((date) => date >= todayIso);
  if (futureDate) return futureDate;

  return dates[dates.length - 1];
}

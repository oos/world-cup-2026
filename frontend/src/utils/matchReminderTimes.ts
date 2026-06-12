export const DEFAULT_MATCH_REMINDER_MINUTES = [15];

export const MATCH_REMINDER_PRESETS = [5, 15, 30, 60, 120, 360, 1440] as const;

export const MAX_MATCH_REMINDERS = 6;

export function normalizeMatchReminderMinutes(values: number[]): number[] {
  const normalized = [...new Set(values.map((value) => Math.round(value)).filter((value) => value > 0))]
    .sort((a, b) => a - b)
    .slice(0, MAX_MATCH_REMINDERS);

  return normalized.length > 0 ? normalized : DEFAULT_MATCH_REMINDER_MINUTES;
}

export function parseMatchReminderMinutes(value: unknown): number[] {
  if (!Array.isArray(value)) return DEFAULT_MATCH_REMINDER_MINUTES;
  const parsed = value.filter((item): item is number => typeof item === "number");
  return normalizeMatchReminderMinutes(parsed);
}

export function formatReminderMinutes(minutes: number): string {
  if (minutes < 60) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    if (hours === 1) return "1 hour";
    if (hours < 24) return `${hours} hours`;
    const days = hours / 24;
    return days === 1 ? "1 day" : `${days} days`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

import { type GroupColor, WC26_GROUP_COLORS } from "../theme/plannerColors";
import { groupLetterFromLabel } from "./worldCup2026Planner";

export function matchGroupColors(group: string | null | undefined): GroupColor | null {
  const letter = groupLetterFromLabel(group);
  if (!letter) return null;
  return WC26_GROUP_COLORS[letter] ?? WC26_GROUP_COLORS.A;
}

export function matchGroupAccentColor(group: string | null | undefined): string | null {
  return matchGroupColors(group)?.bg ?? null;
}

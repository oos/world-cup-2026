import type { MatchGoal } from "../api/client";

export function formatMatchGoalMinute(goal: MatchGoal): string | null {
  if (goal.minute == null) return null;
  if (goal.offset != null && goal.offset > 0) {
    return `${goal.minute}'+${goal.offset}`;
  }
  return `${goal.minute}'`;
}

export function formatMatchGoalLabel(goal: MatchGoal): string {
  const minute = formatMatchGoalMinute(goal);
  const tags: string[] = [];
  if (goal.owngoal) tags.push("OG");
  else if (goal.penalty) tags.push("pen");

  let label = minute ? `${goal.name} (${minute})` : goal.name;
  if (tags.length > 0) {
    label = `${label} [${tags.join(", ")}]`;
  }
  return label;
}

export function formatMatchGoalCompact(goal: MatchGoal): string {
  const minute = formatMatchGoalMinute(goal);
  const suffix =
    goal.owngoal ? " (OG)" : goal.penalty ? " (pen)" : "";
  return minute ? `${goal.name} ${minute}${suffix}` : `${goal.name}${suffix}`;
}

export interface GroupedMatchScorer {
  name: string;
  minutes: string[];
}

function formatMatchGoalMinuteLabel(goal: MatchGoal): string {
  const minute = formatMatchGoalMinute(goal);
  const suffix = goal.owngoal ? " (OG)" : goal.penalty ? " (pen)" : "";
  if (minute) return `${minute}${suffix}`;
  return suffix.trim() || "?";
}

export function groupMatchGoalsByScorer(goals: MatchGoal[]): GroupedMatchScorer[] {
  const grouped: GroupedMatchScorer[] = [];
  const indexByName = new Map<string, number>();

  for (const goal of goals) {
    const existingIndex = indexByName.get(goal.name);
    const minuteLabel = formatMatchGoalMinuteLabel(goal);

    if (existingIndex != null) {
      grouped[existingIndex].minutes.push(minuteLabel);
      continue;
    }

    indexByName.set(goal.name, grouped.length);
    grouped.push({ name: goal.name, minutes: [minuteLabel] });
  }

  return grouped;
}

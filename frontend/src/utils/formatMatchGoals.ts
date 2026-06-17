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

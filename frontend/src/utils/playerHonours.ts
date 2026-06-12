import type { PlayerMajorHonour } from "../api/client";

const MAJOR_SHORT_LABELS: Record<string, string> = {
  world_cup: "WC",
  champions_league: "UCL",
  euro: "EURO",
  copa_america: "COPA",
  afcon: "AFCON",
  gold_cup: "GOLD",
};

export function majorHonourShortLabel(honour: PlayerMajorHonour): string {
  return MAJOR_SHORT_LABELS[honour.key] ?? honour.label;
}

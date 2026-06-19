export type RoadmapStatus = "considering" | "planned" | "in_progress" | "shipped";

export type RoadmapCategory =
  | "Matches"
  | "Players"
  | "Predictions"
  | "Notifications"
  | "Experience"
  | "Data";

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
  status: RoadmapStatus;
  /** Seed vote count shown before any local votes are added. */
  votes: number;
}

export interface RoadmapStatusMeta {
  status: RoadmapStatus;
  label: string;
  /** Short blurb shown under the status heading. */
  blurb: string;
  accent: string;
}

export const ROADMAP_STATUS_ORDER: RoadmapStatus[] = [
  "shipped",
  "in_progress",
  "planned",
  "considering",
];

export const ROADMAP_STATUS_META: Record<RoadmapStatus, RoadmapStatusMeta> = {
  shipped: {
    status: "shipped",
    label: "Shipped",
    blurb: "Live now — go try it.",
    accent: "var(--palette-green)",
  },
  in_progress: {
    status: "in_progress",
    label: "In progress",
    blurb: "We're building this right now.",
    accent: "var(--palette-blue)",
  },
  planned: {
    status: "planned",
    label: "Planned",
    blurb: "On the schedule, coming soon.",
    accent: "var(--palette-orange)",
  },
  considering: {
    status: "considering",
    label: "Under consideration",
    blurb: "Ideas we're weighing up — your votes decide.",
    accent: "var(--palette-lavender)",
  },
};

export const ROADMAP_CATEGORY_ACCENTS: Record<RoadmapCategory, string> = {
  Matches: "var(--palette-blue)",
  Players: "var(--palette-teal)",
  Predictions: "var(--palette-navy)",
  Notifications: "var(--palette-orange)",
  Experience: "var(--palette-purple)",
  Data: "var(--palette-green)",
};

export const ROADMAP_CATEGORIES: RoadmapCategory[] = [
  "Matches",
  "Players",
  "Predictions",
  "Notifications",
  "Experience",
  "Data",
];

export const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    id: "live-scores",
    title: "Live scores & match clock",
    description:
      "Real-time scores, goal events, and the match minute for every fixture as it happens.",
    category: "Matches",
    status: "shipped",
    votes: 134,
  },
  {
    id: "knockout-predictions",
    title: "Knockout bracket predictor",
    description:
      "Fill in your own knockout bracket and see how your picks play out round by round.",
    category: "Predictions",
    status: "shipped",
    votes: 121,
  },
  {
    id: "history-explorer",
    title: "World Cup history explorer",
    description:
      "Past winners, golden boots, and every tournament match back through the decades.",
    category: "Data",
    status: "shipped",
    votes: 88,
  },
  {
    id: "goal-notifications",
    title: "Goal & kick-off notifications",
    description:
      "Opt-in push alerts when your saved teams kick off, concede, or score during the tournament.",
    category: "Notifications",
    status: "in_progress",
    votes: 142,
  },
  {
    id: "player-comparison",
    title: "Player comparison tool",
    description:
      "Put two squad players side by side and compare goals, minutes, and tournament form.",
    category: "Players",
    status: "in_progress",
    votes: 97,
  },
  {
    id: "group-simulator",
    title: "Group-stage simulator",
    description:
      "Play out the remaining group fixtures and watch the standings and qualifiers update instantly.",
    category: "Predictions",
    status: "planned",
    votes: 110,
  },
  {
    id: "fixture-calendar-export",
    title: "Add fixtures to your calendar",
    description:
      "Export any team's matches to Google, Apple, or Outlook calendars with one tap (.ics).",
    category: "Matches",
    status: "planned",
    votes: 76,
  },
  {
    id: "personal-dashboard",
    title: "Personalised team dashboard",
    description:
      "A home view built around your favourite team — next match, form, squad, and group race.",
    category: "Experience",
    status: "planned",
    votes: 69,
  },
  {
    id: "dark-mode",
    title: "Dark mode",
    description: "A full dark theme for late-night fixtures and kinder battery life.",
    category: "Experience",
    status: "considering",
    votes: 64,
  },
  {
    id: "multi-language",
    title: "Multi-language support",
    description:
      "Spanish, French, and Portuguese to start — the World Cup is for everyone.",
    category: "Experience",
    status: "considering",
    votes: 52,
  },
  {
    id: "head-to-head",
    title: "Team head-to-head records",
    description:
      "Historical results, goals, and meetings between any two nations across every World Cup.",
    category: "Data",
    status: "considering",
    votes: 41,
  },
  {
    id: "venue-travel-guides",
    title: "Host city travel guides",
    description:
      "Stadium info, getting around, and fan-zone tips for all 16 host cities.",
    category: "Experience",
    status: "considering",
    votes: 33,
  },
];

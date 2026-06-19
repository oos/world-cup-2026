import {
  CalendarDays,
  Flag,
  History,
  Layers,
  MapPin,
  Table2,
  TrendingUp,
  Trophy,
  Tv,
  type LucideIcon,
} from "lucide-react";

export type WorldCupFaqLink = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

export const WORLD_CUP_FAQ_LINKS: WorldCupFaqLink[] = [
  {
    to: "/today",
    label: "Who plays today?",
    description: "Today's World Cup fixtures in your timezone",
    icon: CalendarDays,
    accent: "var(--palette-blue)",
  },
  {
    to: "/schedule",
    label: "Schedule & fixtures",
    description: "Full fixture list with dates, times, and venues",
    icon: CalendarDays,
    accent: "var(--palette-blue)",
  },
  {
    to: "/standings",
    label: "Group standings",
    description: "Live tables for all 12 groups",
    icon: Table2,
    accent: "var(--palette-teal)",
  },
  {
    to: "/groups",
    label: "Groups",
    description: "All 12 groups and which teams are in each",
    icon: Layers,
    accent: "var(--palette-teal)",
  },
  {
    to: "/bracket",
    label: "Knockout bracket",
    description: "Round of 32 through to the final",
    icon: Trophy,
    accent: "var(--palette-navy)",
  },
  {
    to: "/host-cities",
    label: "Host Cities & Venues",
    description: "16 stadium cities across North America",
    icon: MapPin,
    accent: "var(--palette-green)",
  },
  {
    to: "/squads",
    label: "Squads",
    description: "Every national team squad for 2026",
    icon: Flag,
    accent: "var(--palette-navy)",
  },
  {
    to: "/watch",
    label: "Where to watch",
    description: "Broadcasters and streaming by country",
    icon: Tv,
    accent: "var(--palette-blue)",
  },
  {
    to: "/winners",
    label: "Past winners",
    description: "World Cup champions from 1930 to 2022",
    icon: History,
    accent: "var(--palette-navy)",
  },
  {
    to: "/trends",
    label: "Trending",
    description: "Google search interest for every squad over the past year",
    icon: TrendingUp,
    accent: "var(--palette-orange)",
  },
];

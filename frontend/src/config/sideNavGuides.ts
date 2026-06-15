import {
  CalendarDays,
  Flag,
  HelpCircle,
  History,
  Layers,
  MapPin,
  Table2,
  Trophy,
  Tv,
  type LucideIcon,
} from "lucide-react";

export type SideNavGuideItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  accent: string;
};

/** Pages mapped to common Google Trends themes for "world cup" (past 30 days). */
export const SIDE_NAV_GUIDE_ITEMS: SideNavGuideItem[] = [
  {
    to: "/today",
    label: "Who plays today?",
    icon: CalendarDays,
    accent: "var(--palette-blue)",
  },
  {
    to: "/guide",
    label: "When is it?",
    icon: HelpCircle,
    accent: "var(--palette-orange)",
  },
  {
    to: "/schedule",
    label: "Schedule & fixtures",
    icon: CalendarDays,
    accent: "var(--palette-blue)",
  },
  {
    to: "/standings",
    label: "Group standings",
    icon: Table2,
    accent: "var(--palette-teal)",
  },
  {
    to: "/groups",
    label: "Groups",
    icon: Layers,
    accent: "var(--palette-teal)",
  },
  {
    to: "/bracket",
    label: "Knockout bracket",
    icon: Trophy,
    accent: "var(--palette-navy)",
  },
  {
    to: "/squads",
    label: "Squads",
    icon: Flag,
    accent: "var(--palette-navy)",
  },
  {
    to: "/venues",
    label: "Host cities",
    icon: MapPin,
    accent: "var(--palette-green)",
  },
  {
    to: "/watch",
    label: "Where to watch",
    icon: Tv,
    accent: "var(--palette-blue)",
  },
  {
    to: "/winners",
    label: "Past winners",
    icon: History,
    accent: "var(--palette-navy)",
  },
];

export function isSideNavGuideActive(pathname: string, path: string): boolean {
  if (path === "/schedule") {
    return pathname === "/schedule" || pathname.startsWith("/schedule/");
  }
  if (path === "/watch") {
    return pathname.startsWith("/watch");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

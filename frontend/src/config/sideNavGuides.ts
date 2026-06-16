import {
  CalendarDays,
  Flag,
  HelpCircle,
  History,
  Layers,
  MapPin,
  Table2,
  TrendingUp,
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

export type SideNavGuideSection = {
  title: string;
  items: SideNavGuideItem[];
};

export const SIDE_NAV_GUIDE_SECTIONS: SideNavGuideSection[] = [
  {
    title: "Schedule",
    items: [
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
    ],
  },
  {
    title: "Groups",
    items: [
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
    ],
  },
  {
    title: "History",
    items: [
      {
        to: "/winners",
        label: "Past winners",
        icon: History,
        accent: "var(--palette-navy)",
      },
    ],
  },
  {
    title: "Other",
    items: [
      {
        to: "/world-rankings",
        label: "FIFA World Rankings",
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
        label: "Host Cities & Venues",
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
        to: "/trends",
        label: "Trending",
        icon: TrendingUp,
        accent: "var(--palette-orange)",
      },
    ],
  },
];

export function isSideNavGuideActive(pathname: string, path: string): boolean {
  if (path === "/schedule") {
    return pathname === "/schedule" || pathname.startsWith("/schedule/");
  }
  if (path === "/watch") {
    return pathname.startsWith("/watch");
  }
  if (path === "/world-rankings") {
    return pathname === "/world-rankings";
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

import {
  CalendarDays,
  Flag,
  HelpCircle,
  Layers,
  MapPin,
  type LucideIcon,
} from "lucide-react";

export type SideNavGuideItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  accent: string;
};

/** Pages that answer common Google Trends searches for "world cup". */
export const SIDE_NAV_GUIDE_ITEMS: SideNavGuideItem[] = [
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
    to: "/groups",
    label: "Groups",
    icon: Layers,
    accent: "var(--palette-teal)",
  },
  {
    to: "/venues",
    label: "Host cities",
    icon: MapPin,
    accent: "var(--palette-green)",
  },
  {
    to: "/squads",
    label: "Squads",
    icon: Flag,
    accent: "var(--palette-navy)",
  },
];

export function isSideNavGuideActive(pathname: string, path: string): boolean {
  if (path === "/schedule") {
    return pathname === "/schedule" || pathname.startsWith("/schedule/");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

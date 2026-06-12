import {
  CalendarDays,
  Flag,
  History,
  LayoutDashboard,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  to: string;
  label: string;
  icon?: LucideIcon;
  textIcon?: string;
  textIconClassName?: string;
  accent: string;
};

export const WC_2026_PATH = "/WC-2026";

export const APP_NAV_ITEMS: AppNavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, accent: "var(--palette-slate)" },
  {
    to: WC_2026_PATH,
    label: "2026 WC",
    textIcon: "26",
    textIconClassName: "nav-text-icon--wc26",
    accent: "var(--palette-orange)",
  },
  { to: "/teams", label: "Teams", icon: Flag, accent: "var(--palette-navy)" },
  { to: "/players", label: "Players", icon: UserRound, accent: "var(--palette-teal)" },
  { to: "/matches", label: "Matches", icon: CalendarDays, accent: "var(--palette-blue)" },
  { to: "/history", label: "History", icon: History, accent: "var(--palette-navy)" },
];

export function isAppNavActive(pathname: string, path: string): boolean {
  return pathname === path || (path !== "/dashboard" && pathname.startsWith(path));
}

/** Accent colour for the main nav item that owns this route (icon background colour). */
export function getNavAccentForPath(pathname: string): string | undefined {
  return APP_NAV_ITEMS.find(({ to }) => isAppNavActive(pathname, to))?.accent;
}

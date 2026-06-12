import { Bookmark, Eye, Info, Tv, UserRound, type LucideIcon } from "lucide-react";

export type SideNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  accent: string;
};

export const SIDE_NAV_SECONDARY_ITEMS: SideNavItem[] = [
  {
    to: "/viewing-matches",
    label: "Viewing Matches",
    icon: Eye,
    accent: "var(--palette-green)",
  },
  {
    to: "/saved",
    label: "Saved items",
    icon: Bookmark,
    accent: "var(--palette-teal)",
  },
  {
    to: "/watch",
    label: "Where to watch",
    icon: Tv,
    accent: "var(--palette-blue)",
  },
  {
    to: "/profile",
    label: "Profile",
    icon: UserRound,
    accent: "var(--palette-slate)",
  },
  {
    to: "/about",
    label: "About",
    icon: Info,
    accent: "var(--palette-navy)",
  },
];

export function isSideNavActive(pathname: string, path: string): boolean {
  if (path === "/watch") return pathname.startsWith("/watch");
  if (path === "/viewing-matches") return pathname.startsWith("/viewing-matches");
  return pathname === path;
}

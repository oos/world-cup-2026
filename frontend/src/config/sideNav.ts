import { Bookmark, type LucideIcon } from "lucide-react";

export type SideNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  accent: string;
};

export const SIDE_NAV_BOOKMARKED_ITEM: SideNavItem = {
  to: "/saved",
  label: "Bookmarked",
  icon: Bookmark,
  accent: "var(--palette-teal)",
};

export function isSideNavActive(pathname: string, path: string): boolean {
  return pathname === path;
}

import { Bookmark, type LucideIcon } from "lucide-react";

export type SideNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  accent: string;
};

export const SIDE_NAV_SECONDARY_ITEMS: SideNavItem[] = [
  {
    to: "/saved",
    label: "Saved",
    icon: Bookmark,
    accent: "var(--palette-teal)",
  },
];

export function isSideNavActive(pathname: string, path: string): boolean {
  return pathname === path;
}

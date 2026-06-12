import { CalendarDays, Flag, History, Home, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { FilterSidePanel } from "./FilterPanel";
import { FilterPanelProvider } from "../context/FilterPanelContext";
import { TopBar } from "./TopBar";

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/teams", label: "Teams", icon: Flag },
  { to: "/players", label: "Players", icon: UserRound },
  { to: "/matches", label: "Matches", icon: CalendarDays },
  { to: "/history", label: "History", icon: History },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navClass = (path: string) =>
    location.pathname === path ||
    (path !== "/dashboard" && location.pathname.startsWith(path))
      ? "active"
      : "";

  return (
    <FilterPanelProvider>
    <div className="app-shell">
      <TopBar />
      <FilterSidePanel />
      <main className="main-content">{children}</main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = navClass(to) === "active";
          return (
            <Link key={to} to={to} className={navClass(to)} aria-current={active ? "page" : undefined}>
              <span className="nav-icon" aria-hidden="true">
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
    </FilterPanelProvider>
  );
}

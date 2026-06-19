import type { CSSProperties } from "react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { SIDE_NAV_GUIDE_SECTIONS, isSideNavGuideActive } from "../config/sideNavGuides";
import { SIDE_NAV_SECONDARY_ITEMS, isSideNavActive } from "../config/sideNav";
import { useSideNav } from "../context/SideNavContext";
import { useCompetition } from "../context/CompetitionContext";
import { CompetitionSelector } from "./CompetitionSelector";

const TAB_LABELS: Record<string, string> = {
  matches: "Fixtures",
  table: "Table",
  standings: "Standings",
  groups: "Groups",
  bracket: "Knockout bracket",
  teams: "Teams",
  players: "Players",
};

export function SideNav() {
  const { isOpen, close } = useSideNav();
  const location = useLocation();
  const { competition, slug, isScoped } = useCompetition();

  // The World Cup keeps its full bespoke FAQ navigation; other competitions use
  // a compact, format-driven tab list scoped to /c/<slug>.
  const showWorldCupNav = !isScoped || slug === "world-cup-2026";
  const competitionTabs = competition?.layout_config?.tabs ?? [];

  useEffect(() => {
    close();
  }, [location.pathname, close]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  return (
    <>
      <div
        className={`side-nav-backdrop ${isOpen ? "open" : ""}`}
        onClick={close}
        aria-hidden={!isOpen}
      />
      <aside
        className={`side-nav-panel ${isOpen ? "open" : ""}`}
        aria-label="Site navigation"
        aria-hidden={!isOpen}
      >
        <div className="side-nav-header">
          <h2>Menu</h2>
          <button type="button" className="side-nav-close" onClick={close} aria-label="Close menu">
            ✕
          </button>
        </div>
        <nav className="side-nav-body">
          <div className="side-nav-section">
            <CompetitionSelector onSelect={close} />
          </div>
          {isScoped && !showWorldCupNav && competition ? (
            <div className="side-nav-section">
              <h3 className="side-nav-section-title">{competition.name}</h3>
              <ul className="side-nav-list">
                {competitionTabs.map((tab) => {
                  const to = `/c/${slug}/${tab}`;
                  const active = location.pathname === to;
                  return (
                    <li key={tab}>
                      <Link
                        to={to}
                        className={`side-nav-link ${active ? "active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onClick={close}
                      >
                        {TAB_LABELS[tab] ?? tab}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <div className="side-nav-section">
            <h3 className="side-nav-section-title">Bookmarked</h3>
            <ul className="side-nav-list">
              {SIDE_NAV_SECONDARY_ITEMS.map(({ to, label, icon: Icon, accent }) => {
                const active = isSideNavActive(location.pathname, to);
                return (
                  <li key={to}>
                    <Link
                      to={to}
                      className={`side-nav-link ${active ? "active" : ""}`}
                      style={{ "--nav-accent": accent } as CSSProperties}
                      aria-current={active ? "page" : undefined}
                      onClick={close}
                    >
                      <span className="side-nav-link-icon" aria-hidden="true">
                        <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                      </span>
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          {showWorldCupNav ? (
          <div className="side-nav-section">
            <h3 className="side-nav-section-title">2026 WC FAQs</h3>
            {SIDE_NAV_GUIDE_SECTIONS.map((section) => (
              <div key={section.title} className="side-nav-subsection">
                <h4 className="side-nav-subsection-title">{section.title}</h4>
                <ul className="side-nav-list">
                  {section.items.map(({ to, label, icon: Icon, accent }) => {
                    const active = isSideNavGuideActive(location.pathname, to);
                    return (
                      <li key={to}>
                        <Link
                          to={to}
                          className={`side-nav-link ${active ? "active" : ""}`}
                          style={{ "--nav-accent": accent } as CSSProperties}
                          aria-current={active ? "page" : undefined}
                          onClick={close}
                        >
                          <span className="side-nav-link-icon" aria-hidden="true">
                            <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                          </span>
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          ) : null}
        </nav>
      </aside>
    </>
  );
}

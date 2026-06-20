import type { CSSProperties } from "react";
import { LayoutDashboard } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { slugifyTrackName } from "../ads/buttonTracking";
import { isAppNavActive } from "../config/appNav";
import { SIDE_NAV_GUIDE_SECTIONS, isSideNavGuideActive } from "../config/sideNavGuides";
import { SIDE_NAV_BOOKMARKED_ITEM, isSideNavActive } from "../config/sideNav";
import { useSideNav } from "../context/SideNavContext";

const DASHBOARD_LINK = {
  to: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
  accent: "var(--palette-slate)",
} as const;

export function SideNav() {
  const { isOpen, close } = useSideNav();
  const location = useLocation();

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
          <button type="button" className="side-nav-close" onClick={close} aria-label="Close menu" data-track-button="close_menu">
            ✕
          </button>
        </div>
        <nav className="side-nav-body">
          <div className="side-nav-section">
            <ul className="side-nav-list">
              <li>
                <Link
                  to={DASHBOARD_LINK.to}
                  className={`side-nav-link ${isAppNavActive(location.pathname, DASHBOARD_LINK.to) ? "active" : ""}`}
                  style={{ "--nav-accent": DASHBOARD_LINK.accent } as CSSProperties}
                  aria-current={
                    isAppNavActive(location.pathname, DASHBOARD_LINK.to) ? "page" : undefined
                  }
                  data-track-button="side_nav_dashboard"
                  onClick={close}
                >
                  <span className="side-nav-link-icon" aria-hidden="true">
                    <DASHBOARD_LINK.icon size={18} strokeWidth={2} />
                  </span>
                  {DASHBOARD_LINK.label}
                </Link>
              </li>
              <li>
                <Link
                  to={SIDE_NAV_BOOKMARKED_ITEM.to}
                  className={`side-nav-link ${isSideNavActive(location.pathname, SIDE_NAV_BOOKMARKED_ITEM.to) ? "active" : ""}`}
                  style={{ "--nav-accent": SIDE_NAV_BOOKMARKED_ITEM.accent } as CSSProperties}
                  aria-current={
                    isSideNavActive(location.pathname, SIDE_NAV_BOOKMARKED_ITEM.to)
                      ? "page"
                      : undefined
                  }
                  data-track-button={`side_nav_${slugifyTrackName(SIDE_NAV_BOOKMARKED_ITEM.label)}`}
                  onClick={close}
                >
                  <span className="side-nav-link-icon" aria-hidden="true">
                    <SIDE_NAV_BOOKMARKED_ITEM.icon
                      size={18}
                      strokeWidth={
                        isSideNavActive(location.pathname, SIDE_NAV_BOOKMARKED_ITEM.to) ? 2.25 : 1.75
                      }
                    />
                  </span>
                  {SIDE_NAV_BOOKMARKED_ITEM.label}
                </Link>
              </li>
            </ul>
          </div>
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
                          data-track-button={`side_nav_guide_${slugifyTrackName(label)}`}
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
        </nav>
      </aside>
    </>
  );
}

import type { CSSProperties } from "react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { SIDE_NAV_GUIDE_SECTIONS, isSideNavGuideActive } from "../config/sideNavGuides";
import { SIDE_NAV_SECONDARY_ITEMS, isSideNavActive } from "../config/sideNav";
import { useSideNav } from "../context/SideNavContext";

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
          <button type="button" className="side-nav-close" onClick={close} aria-label="Close menu">
            ✕
          </button>
        </div>
        <nav className="side-nav-body">
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
        </nav>
      </aside>
    </>
  );
}

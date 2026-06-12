import type { CSSProperties } from "react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { APP_NAV_ITEMS, isAppNavActive } from "../config/appNav";
import { SIDE_NAV_GUIDE_ITEMS, isSideNavGuideActive } from "../config/sideNavGuides";
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
            <h3 className="side-nav-section-title">Browse</h3>
            <ul className="side-nav-list">
              {APP_NAV_ITEMS.map(({ to, label, icon: Icon, textIcon, textIconClassName, accent }) => {
                const active = isAppNavActive(location.pathname, to);
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
                        {textIcon ? (
                          <span
                            className={`nav-text-icon${textIconClassName ? ` ${textIconClassName}` : ""}`}
                          >
                            {textIcon}
                          </span>
                        ) : Icon ? (
                          <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                        ) : null}
                      </span>
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="side-nav-section">
            <h3 className="side-nav-section-title">Popular searches</h3>
            <ul className="side-nav-list">
              {SIDE_NAV_GUIDE_ITEMS.map(({ to, label, icon: Icon, accent }) => {
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
          <div className="side-nav-section">
            <h3 className="side-nav-section-title">More</h3>
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
        </nav>
      </aside>
    </>
  );
}

import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { slugifyTrackName } from "../ads/buttonTracking";
import { APP_NAV_ITEMS, isAppNavActive } from "../config/appNav";
import { useCompetition } from "../context/CompetitionContext";
import { resolveAppNavPath } from "../hooks/useCompetitionScope";
import { useIsDesktop } from "../hooks/useMediaQuery";

type MainNavProps = {
  variant: "bottom" | "top";
};

export function MainNav({ variant }: MainNavProps) {
  const location = useLocation();
  const { slug } = useCompetition();
  const isTop = variant === "top";
  const isDesktop = useIsDesktop();
  // The top nav shows inline labels on desktop; below that it is icon-only and
  // relies on a tooltip instead.
  const showTopLabel = isTop && isDesktop;

  return (
    <nav className={`main-nav main-nav--${variant}`} aria-label="Main navigation">
      {APP_NAV_ITEMS.map(({ to, label, icon: Icon, textIcon, textIconClassName, accent }) => {
        const href = resolveAppNavPath(to, slug);
        const active = isAppNavActive(location.pathname, to);
        return (
          <Link
            key={to}
            to={href}
            className={active ? "active" : ""}
            style={{ "--nav-accent": accent } as CSSProperties}
            aria-label={label}
            data-track-button={`main_nav_${slugifyTrackName(label)}`}
            aria-current={active ? "page" : undefined}
            title={isTop && !showTopLabel ? label : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {textIcon ? (
                <span className={`nav-text-icon${textIconClassName ? ` ${textIconClassName}` : ""}`}>
                  {textIcon}
                </span>
              ) : Icon ? (
                <Icon size={isTop ? 18 : 22} strokeWidth={active ? 2.25 : 1.75} />
              ) : null}
            </span>
            {isTop ? (
              <span className="main-nav-label">{label}</span>
            ) : (
              label
            )}
          </Link>
        );
      })}
    </nav>
  );
}

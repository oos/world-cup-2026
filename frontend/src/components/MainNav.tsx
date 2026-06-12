import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { APP_NAV_ITEMS, isAppNavActive } from "../config/appNav";

type MainNavProps = {
  variant: "bottom" | "top";
};

export function MainNav({ variant }: MainNavProps) {
  const location = useLocation();
  const isTop = variant === "top";

  return (
    <nav className={`main-nav main-nav--${variant}`} aria-label="Main navigation">
      {APP_NAV_ITEMS.map(({ to, label, icon: Icon, textIcon, textIconClassName, accent }) => {
        const active = isAppNavActive(location.pathname, to);
        return (
          <Link
            key={to}
            to={to}
            className={active ? "active" : ""}
            style={{ "--nav-accent": accent } as CSSProperties}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            title={isTop ? label : undefined}
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
            {!isTop ? label : null}
          </Link>
        );
      })}
    </nav>
  );
}

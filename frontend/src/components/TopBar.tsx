import { Link, useLocation } from "react-router-dom";

export function TopBar() {
  const location = useLocation();
  const isProfile = location.pathname === "/profile";

  return (
    <header className="top-bar">
      <Link to="/" className="top-bar-brand">
        <span className="top-bar-logo" aria-hidden="true">
          ⚽
        </span>
        World Cup 2026
      </Link>
      <div className="top-bar-actions">
        <Link
          to="/profile"
          className={`top-bar-profile ${isProfile ? "active" : ""}`}
          aria-label="Profile"
          aria-current={isProfile ? "page" : undefined}
        >
          <span className="top-bar-profile-icon" aria-hidden="true">
            👤
          </span>
        </Link>
      </div>
    </header>
  );
}

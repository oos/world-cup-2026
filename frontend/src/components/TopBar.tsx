import { Trophy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

export function TopBar() {
  const location = useLocation();
  const isProfile = location.pathname === "/profile";

  return (
    <header className="top-bar">
      <Link to="/dashboard" className="top-bar-brand">
        <span className="top-bar-logo" aria-hidden="true">
          <Trophy size={20} strokeWidth={2.25} />
        </span>
        World Cup stats
      </Link>
      <div className="top-bar-actions">
        <NotificationBell />
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

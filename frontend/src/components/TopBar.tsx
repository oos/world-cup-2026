import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { MainNav } from "./MainNav";
import { NotificationBell } from "./NotificationBell";
import { ProfileMenu } from "./ProfileMenu";

export function TopBar() {
  return (
    <header className="top-bar">
      <Link to="/dashboard" className="top-bar-brand">
        <span className="top-bar-logo" aria-hidden="true">
          <Trophy size={16} strokeWidth={2.35} />
        </span>
        World Cup stats
      </Link>
      <MainNav variant="top" />
      <div className="top-bar-actions">
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}

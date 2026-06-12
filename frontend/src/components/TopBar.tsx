import { Link } from "react-router-dom";
import { MainNav } from "./MainNav";
import { NotificationBell } from "./NotificationBell";
import { ProfileMenu } from "./ProfileMenu";

const LOGO_SRC = "/logo/wc-stats-logo.png";

export function TopBar() {
  return (
    <header className="top-bar">
      <Link to="/dashboard" className="top-bar-brand">
        <img src={LOGO_SRC} alt="World Cup stats" className="top-bar-logo" />
      </Link>
      <MainNav variant="top" />
      <div className="top-bar-actions">
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}

import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useSideNav } from "../context/SideNavContext";
import { MainNav } from "./MainNav";
import { NotificationBell } from "./NotificationBell";
import { ProfileMenu } from "./ProfileMenu";
import { TopBarIcon, TopBarIconButton } from "./TopBarIconButton";

const LOGO_ICON_SRC = "/logo/wc-stats-icon.png";

export function TopBar() {
  const { toggle, isOpen } = useSideNav();

  return (
    <header className="top-bar">
      <div className="top-bar-start">
        <TopBarIconButton
          label="Open menu"
          pressed={isOpen}
          className="top-bar-menu-btn"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={toggle}
        >
          <TopBarIcon icon={Menu} size={22} strokeWidth={2.1} />
        </TopBarIconButton>
        <Link to="/dashboard" className="top-bar-brand">
          <img
            src={LOGO_ICON_SRC}
            alt=""
            className="top-bar-logo-icon"
            aria-hidden="true"
          />
          <span className="top-bar-logo-text">
            <span className="top-bar-logo-title">WORLD CUP</span>
            <span className="top-bar-logo-tagline">
              <span className="top-bar-logo-tagline-rule" aria-hidden="true" />
              STATS
              <span className="top-bar-logo-tagline-rule" aria-hidden="true" />
            </span>
          </span>
          <span className="visually-hidden">World Cup stats</span>
        </Link>
      </div>
      <MainNav variant="top" />
      <div className="top-bar-actions">
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}

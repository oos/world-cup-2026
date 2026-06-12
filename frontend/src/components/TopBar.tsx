import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useSideNav } from "../context/SideNavContext";
import { MainNav } from "./MainNav";
import { NotificationBell } from "./NotificationBell";
import { ProfileMenu } from "./ProfileMenu";
import { TopBarIcon, TopBarIconButton } from "./TopBarIconButton";

const LOGO_SRC = "/logo/wc-stats-logo.png";

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
          <TopBarIcon icon={Menu} strokeWidth={2.1} />
        </TopBarIconButton>
        <Link to="/dashboard" className="top-bar-brand">
          <img src={LOGO_SRC} alt="World Cup stats" className="top-bar-logo" />
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

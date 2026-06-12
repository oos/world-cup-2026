import { useEffect, useId, useRef, useState } from "react";
import { Bookmark, CircleUser, Info, Tv, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { TopBarIcon, TopBarIconButton } from "./TopBarIconButton";

const MENU_ITEMS = [
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/saved", label: "Saved items", icon: Bookmark },
  { to: "/watch", label: "Where to watch", icon: Tv },
  { to: "/about", label: "About", icon: Info },
] as const;

export function ProfileMenu() {
  const menuId = useId();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const isProfileArea = MENU_ITEMS.some((item) =>
    item.to === "/watch"
      ? location.pathname.startsWith("/watch")
      : location.pathname === item.to
  );
  const isActive = (path: string) =>
    path === "/watch"
      ? location.pathname.startsWith("/watch")
      : location.pathname === path;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="top-bar-profile-menu" ref={containerRef}>
      <TopBarIconButton
        label="Profile menu"
        active={isProfileArea}
        pressed={open}
        className="top-bar-profile"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <TopBarIcon icon={CircleUser} strokeWidth={2.1} />
      </TopBarIconButton>

      {open && (
        <div
          id={menuId}
          className="top-bar-profile-dropdown"
          role="menu"
          aria-label="Profile menu"
        >
          {MENU_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`top-bar-profile-dropdown-item ${isActive(to) ? "active" : ""}`}
              role="menuitem"
              aria-current={isActive(to) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

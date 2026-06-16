import { useEffect, useId, useRef, useState } from "react";
import { CircleUser, Info, LogIn, LogOut, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getAuthDisplayName, useAuth } from "../context/AuthContext";
import { currentReturnPath, withReturnTo } from "../utils/navigation";
import { TopBarIcon, TopBarIconButton } from "./TopBarIconButton";

const MENU_ITEMS = [
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/about", label: "About", icon: Info },
] as const;

export function ProfileMenu() {
  const menuId = useId();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const isProfileArea = MENU_ITEMS.some((item) => location.pathname === item.to);
  const isActive = (path: string) => location.pathname === path;
  const returnPath = currentReturnPath(location);
  const authPath = withReturnTo("/auth", returnPath);
  const displayName = getAuthDisplayName(user);

  useEffect(() => {
    setOpen(false);
    setSignOutError(null);
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

    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointerDown);
    }, 0);

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSignOut = () => {
    setSignOutError(null);
    void signOut()
      .then(() => setOpen(false))
      .catch((error) => {
        setSignOutError(
          error instanceof Error ? error.message : "Could not sign out. Try again.",
        );
      });
  };

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
        <TopBarIcon icon={CircleUser} size={22} strokeWidth={2.1} />
      </TopBarIconButton>

      {open && (
        <div
          id={menuId}
          className="top-bar-profile-dropdown"
          role="menu"
          aria-label="Profile menu"
        >
          {user ? (
            <div className="top-bar-profile-dropdown-user">
              <strong>{displayName}</strong>
              <span>{user.email}</span>
            </div>
          ) : (
            <Link
              to={authPath}
              className="top-bar-profile-dropdown-item top-bar-profile-dropdown-item--action"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <LogIn size={16} strokeWidth={2} aria-hidden="true" />
              Sign in or create account
            </Link>
          )}

          <div className="top-bar-profile-dropdown-divider" aria-hidden="true" />

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

          {user && (
            <>
              <div className="top-bar-profile-dropdown-divider" aria-hidden="true" />
              <button
                type="button"
                className="top-bar-profile-dropdown-item top-bar-profile-dropdown-item--action top-bar-profile-dropdown-item--sign-out"
                role="menuitem"
                onClick={handleSignOut}
              >
                <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                Sign out
              </button>
              {signOutError && (
                <p className="top-bar-profile-dropdown-error">{signOutError}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

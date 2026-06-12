import { Bell, BellRing } from "lucide-react";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { TopBarIcon, TopBarIconButton } from "./TopBarIconButton";

export function NotificationBell() {
  const { supported, enabled, loading, permission, toggle } = usePushNotifications();

  if (!supported) return null;

  const isActive = enabled && permission === "granted";
  const label = isActive
    ? "Match notifications on"
    : permission === "denied"
      ? "Notifications blocked in browser settings"
      : "Turn on match notifications";

  return (
    <TopBarIconButton
      label={label}
      active={isActive}
      pressed={isActive}
      disabled={loading || permission === "denied"}
      className="top-bar-notifications"
      onClick={() => {
        void toggle();
      }}
    >
      {isActive ? (
        <TopBarIcon icon={BellRing} strokeWidth={2.15} />
      ) : (
        <TopBarIcon icon={Bell} />
      )}
      {isActive && <span className="top-bar-icon-badge" aria-hidden="true" />}
    </TopBarIconButton>
  );
}

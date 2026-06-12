import { Bell, BellRing } from "lucide-react";
import { usePushNotifications } from "../hooks/usePushNotifications";

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
    <button
      type="button"
      className={`top-bar-notifications ${isActive ? "is-active" : ""}`}
      aria-label={label}
      aria-pressed={isActive}
      disabled={loading || permission === "denied"}
      onClick={() => {
        void toggle();
      }}
    >
      {isActive ? (
        <BellRing size={20} strokeWidth={2.1} aria-hidden="true" />
      ) : (
        <Bell size={20} strokeWidth={2} aria-hidden="true" />
      )}
      {isActive && <span className="top-bar-notifications-dot" aria-hidden="true" />}
    </button>
  );
}

import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { slugifyTrackName } from "../ads/buttonTracking";

interface TopBarIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  trackButton?: string;
  active?: boolean;
  pressed?: boolean;
  children: ReactNode;
}

export function TopBarIconButton({
  label,
  trackButton,
  active = false,
  pressed,
  className = "",
  children,
  ...rest
}: TopBarIconButtonProps) {
  return (
    <button
      type="button"
      className={`top-bar-icon-btn ${active ? "is-active" : ""} ${className}`.trim()}
      aria-label={label}
      aria-pressed={pressed}
      data-track-button={trackButton ?? slugifyTrackName(label)}
      {...rest}
    >
      {children}
    </button>
  );
}

interface TopBarIconProps {
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
}

export function TopBarIcon({ icon: Icon, size = 18, strokeWidth = 2 }: TopBarIconProps) {
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

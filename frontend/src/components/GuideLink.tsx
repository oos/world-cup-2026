import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export function GuideLink({
  to,
  label,
  description,
  icon: Icon,
  accent,
}: {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <Link
      to={to}
      className="guide-link-card"
      style={{ "--guide-accent": accent } as CSSProperties}
    >
      <span className="guide-link-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2} />
      </span>
      <span className="guide-link-copy">
        <span className="guide-link-label">{label}</span>
        <span className="guide-link-description">{description}</span>
      </span>
    </Link>
  );
}

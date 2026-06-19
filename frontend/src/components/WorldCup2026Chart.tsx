import { useMemo, type ComponentType, type CSSProperties } from "react";
import { LayoutGrid, MapPin, Trophy, type LucideProps } from "lucide-react";
import { Link } from "react-router-dom";
import type { Match } from "../api/client";
import { HOST_CITIES_PATH } from "../config/appNav";
import { WC26_PLANNER_VENUES } from "../utils/worldCup2026Planner";

const KNOCKOUT_PREDICTIONS_PATH = "/knockout-predictions";

function Wc26PromoPanel({
  to,
  icon: Icon,
  title,
  meta,
  accent,
}: {
  to: string;
  icon: ComponentType<LucideProps>;
  title: string;
  meta: string;
  accent: string;
}) {
  return (
    <Link
      to={to}
      className="wc26-planner-promo"
      style={{ "--promo-accent": accent } as CSSProperties}
    >
      <span className="wc26-planner-promo-icon" aria-hidden="true">
        <Icon size={22} strokeWidth={2.1} />
      </span>
      <span className="wc26-planner-promo-copy">
        <span className="wc26-planner-promo-header">
          <span className="wc26-planner-promo-title">{title}</span>
          <span className="ui-button wc26-planner-promo-view">
            View <span aria-hidden="true">→</span>
          </span>
        </span>
        <span className="wc26-planner-promo-meta">{meta}</span>
      </span>
    </Link>
  );
}

export function WorldCup2026Chart({ matches }: { matches: Match[] }) {
  const groupStageMeta = useMemo(() => {
    const played = matches.filter(
      (match) => match.round?.startsWith("Matchday") && match.score?.ft
    ).length;
    const total = matches.filter((match) => match.round?.startsWith("Matchday")).length;
    return `${played}/${total} played`;
  }, [matches]);

  const knockoutMeta = useMemo(() => {
    const knockoutCount = matches.filter(
      (match) => match.round && !match.round.startsWith("Matchday")
    ).length;
    return `${knockoutCount} knockout fixtures`;
  }, [matches]);

  return (
    <div className="wc26-chart-stack">
      <Wc26PromoPanel
        to={HOST_CITIES_PATH}
        icon={MapPin}
        title="Host Cities & Stadiums"
        meta={`${WC26_PLANNER_VENUES.length} stadium cities across North America`}
        accent="var(--palette-green)"
      />

      <Wc26PromoPanel
        to="/schedule"
        icon={LayoutGrid}
        title="World Cup planner"
        meta={`Venue grid by date · ${groupStageMeta}`}
        accent="var(--palette-blue)"
      />

      <Wc26PromoPanel
        to={KNOCKOUT_PREDICTIONS_PATH}
        icon={Trophy}
        title="Knockout predictions"
        meta={knockoutMeta}
        accent="var(--palette-orange)"
      />
    </div>
  );
}

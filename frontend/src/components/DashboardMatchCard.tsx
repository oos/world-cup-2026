import type { Match } from "../api/client";
import { MatchCard } from "./MatchCard";

/** Match card UI aligned with the Home dashboard upcoming-matches section. */
export function DashboardMatchCard({ match }: { match: Match }) {
  return <MatchCard match={match} showDate={false} showGroupAccent />;
}

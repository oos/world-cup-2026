import { Matches } from "./Matches";
import { usePageMeta } from "../hooks/usePageMeta";

export function Schedule() {
  usePageMeta(
    "World Cup 2026 Schedule & Fixtures",
    "Full match list with dates, times, and venues",
  );

  return (
    <Matches
      pageTitle="World Cup 2026 schedule"
      pageSubtitle="Full fixture list with dates, times, and venues"
      accent="var(--palette-blue)"
      basePath="/schedule"
      enableScheduleViews
    />
  );
}

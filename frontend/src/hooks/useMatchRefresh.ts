import { useEffect } from "react";

const DEFAULT_INTERVAL_MS = 60_000;

export function useMatchRefresh(
  refetch: () => void | Promise<void>,
  shouldPoll: boolean,
  intervalMs = DEFAULT_INTERVAL_MS,
): void {
  useEffect(() => {
    if (!shouldPoll) return;

    const tick = () => {
      if (document.visibilityState === "visible") {
        void refetch();
      }
    };

    const intervalId = window.setInterval(tick, intervalMs);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refetch, shouldPoll, intervalMs]);
}

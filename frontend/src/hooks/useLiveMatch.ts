import { useEffect, useRef, useState } from "react";
import { api, type Match } from "../api/client";
import {
  isMatchInPlay,
  MATCH_IN_PLAY_WINDOW_MS,
  parseMatchDateTime,
} from "../utils/matchTime";

export const LIVE_MATCH_REFRESH_INTERVAL_MS = 60_000;

export function useLiveMatch(match: Match, enabled = true): Match {
  const [liveMatch, setLiveMatch] = useState(match);
  const liveMatchRef = useRef(match);
  liveMatchRef.current = liveMatch;

  const propKey = `${match.id}|${match.date}|${match.time}|${match.score?.ft?.join(",") ?? ""}`;
  useEffect(() => {
    setLiveMatch(match);
  }, [propKey, match]);

  useEffect(() => {
    if (!enabled) return;

    const kickoff = match.date ? parseMatchDateTime(match.date, match.time) : null;
    if (!kickoff || match.score?.ft) return;

    const kickoffMs = kickoff.getTime();
    const windowEndMs = kickoffMs + MATCH_IN_PLAY_WINDOW_MS;
    const now = Date.now();
    if (now >= windowEndMs) return;

    let intervalId: number | undefined;
    let kickoffTimerId: number | undefined;
    let stopTimerId: number | undefined;

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void api
        .getMatch(match.id)
        .then(setLiveMatch)
        .catch(() => {
          // Keep showing the last known match data.
        });
    };

    const startPolling = () => {
      refresh();
      intervalId = window.setInterval(() => {
        const current = liveMatchRef.current;
        if (isMatchInPlay(current.date, current.time, current.score)) {
          refresh();
        }
      }, LIVE_MATCH_REFRESH_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    if (now >= kickoffMs) {
      startPolling();
    } else {
      kickoffTimerId = window.setTimeout(startPolling, kickoffMs - now);
    }

    stopTimerId = window.setTimeout(stopPolling, windowEndMs - now);

    const onVisible = () => {
      const current = liveMatchRef.current;
      if (isMatchInPlay(current.date, current.time, current.score)) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopPolling();
      if (kickoffTimerId !== undefined) window.clearTimeout(kickoffTimerId);
      if (stopTimerId !== undefined) window.clearTimeout(stopTimerId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, match.id, match.date, match.time, match.score?.ft]);

  return liveMatch;
}

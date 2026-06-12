import { useCallback, useEffect, useMemo, useState } from "react";

const VIEWING_MATCHES_KEY = "wc26_viewing_matches";
const VIEWING_MATCHES_UPDATED_EVENT = "wc26-viewing-matches-updated";

export type ViewingMatchEntry = {
  matchId: number;
  addedAt: string;
};

function readViewingMatches(): ViewingMatchEntry[] {
  try {
    const stored = localStorage.getItem(VIEWING_MATCHES_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as ViewingMatchEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry) => typeof entry.matchId === "number" && entry.matchId > 0 && typeof entry.addedAt === "string",
    );
  } catch {
    return [];
  }
}

function notifyViewingMatchesUpdated() {
  window.dispatchEvent(new CustomEvent(VIEWING_MATCHES_UPDATED_EVENT));
}

function writeViewingMatches(entries: ViewingMatchEntry[]) {
  localStorage.setItem(VIEWING_MATCHES_KEY, JSON.stringify(entries));
  notifyViewingMatchesUpdated();
}

export function useViewingMatches() {
  const [entries, setEntries] = useState<ViewingMatchEntry[]>(readViewingMatches);

  useEffect(() => {
    const syncEntries = () => setEntries(readViewingMatches());
    window.addEventListener(VIEWING_MATCHES_UPDATED_EVENT, syncEntries);
    return () => window.removeEventListener(VIEWING_MATCHES_UPDATED_EVENT, syncEntries);
  }, []);

  const matchIds = useMemo(() => entries.map((entry) => entry.matchId), [entries]);

  const matchIdSet = useMemo(() => new Set(matchIds), [matchIds]);

  const isViewing = useCallback(
    (matchId: number) => matchIdSet.has(matchId),
    [matchIdSet],
  );

  const addViewing = useCallback((matchId: number) => {
    setEntries((current) => {
      if (current.some((entry) => entry.matchId === matchId)) return current;
      const next = [{ matchId, addedAt: new Date().toISOString() }, ...current];
      writeViewingMatches(next);
      return next;
    });
  }, []);

  const removeViewing = useCallback((matchId: number) => {
    setEntries((current) => {
      const next = current.filter((entry) => entry.matchId !== matchId);
      writeViewingMatches(next);
      return next;
    });
  }, []);

  const toggleViewing = useCallback(
    (matchId: number) => {
      if (matchIdSet.has(matchId)) {
        removeViewing(matchId);
        return;
      }
      addViewing(matchId);
    },
    [addViewing, matchIdSet, removeViewing],
  );

  return {
    entries,
    matchIds,
    isViewing,
    addViewing,
    removeViewing,
    toggleViewing,
  };
}

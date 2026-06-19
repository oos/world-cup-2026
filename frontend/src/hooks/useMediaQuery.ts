import { useSyncExternalStore } from "react";
import { MEDIA_QUERIES } from "../config/breakpoints";

/**
 * Subscribe to a CSS media query and re-render when it changes.
 *
 * Reads `matchMedia` synchronously on first render (via `useSyncExternalStore`)
 * so there is no flash of the wrong layout. Falls back to `false` in
 * environments without `matchMedia`.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  };

  const getSnapshot = () => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** True at the desktop breakpoint (>= 1024px) and up. */
export function useIsDesktop(): boolean {
  return useMediaQuery(MEDIA_QUERIES.desktopUp);
}

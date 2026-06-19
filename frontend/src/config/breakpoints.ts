/**
 * Shared responsive breakpoints.
 *
 * These values are the single source of truth for layout breakpoints and must
 * stay in sync with the `@media` rules in `src/styles/global.css`. Use the
 * `useMediaQuery` / `useIsDesktop` hooks to read them from JS/TS.
 */
export const BREAKPOINTS = {
  /** Tablet+: bottom tab bar collapses into the top bar. */
  sm: 640,
  /** Desktop: labeled top nav and the wider content column kick in. */
  desktop: 1024,
  /** Large desktop: content column reaches its widest. */
  wide: 1280,
} as const;

export const MEDIA_QUERIES = {
  smUp: `(min-width: ${BREAKPOINTS.sm}px)`,
  desktopUp: `(min-width: ${BREAKPOINTS.desktop}px)`,
  wideUp: `(min-width: ${BREAKPOINTS.wide}px)`,
} as const;

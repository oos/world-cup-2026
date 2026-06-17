# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the World Cup 2026 frontend. PostHog was already partially wired up (`posthog-js` and `@posthog/react` installed, `PostHogProvider` in place, and a consent-gated `AnalyticsProvider`). This run added user identification, sign-in/out captures, error boundary coverage, and 9 new business events across 7 files.

**Key changes:**

- `src/main.tsx` — Added `PostHogErrorBoundary` around the app to auto-capture unhandled React errors.
- `src/context/AuthContext.tsx` — Added `posthog.identify()` on password sign-in and sign-up (with `email` and `name` traits), and `posthog.capture("user_signed_out")` + `posthog.reset()` on sign-out so the sign-out event is captured against the authenticated user before the session resets.
- `src/pages/AuthCallback.tsx` — Added `posthog.identify()` after magic-link/OAuth token verification so returning-visitor sessions are identified correctly.
- `src/components/AuthForm.tsx` — Added `trackSignUp("password")` (reusing the existing analytics helper) and `posthog.capture("sign_in", { method: "password" })` in the submit handler.
- `src/hooks/useSavedItems.ts` — Added `item_saved` and `item_removed` captures in `addSaved`/`removeSaved`, covering both authenticated and guest flows.
- `src/pages/Watch.tsx` — Added `watch_country_selected` capture on the country-list `Link` `onClick`.
- `src/pages/Squads.tsx` — Added `squad_searched` capture in the search `onChange` wrapper (fires on non-empty queries).
- `src/pages/Groups.tsx` — Added `groups_view_changed` capture in `updateView`.
- `src/pages/Profile.tsx` — Added `match_reminders_toggled`, `timezone_updated`, and `preferred_team_set` captures in the respective event handlers.

## Events

| Event | Description | File |
|-------|-------------|------|
| `sign_up` | User completes account creation via password sign-up | `src/components/AuthForm.tsx` |
| `sign_in` | User successfully signs in with password | `src/components/AuthForm.tsx` |
| `user_signed_out` | User signs out from their account | `src/context/AuthContext.tsx` |
| `item_saved` | User bookmarks a team or player | `src/hooks/useSavedItems.ts` |
| `item_removed` | User removes a bookmarked team or player | `src/hooks/useSavedItems.ts` |
| `watch_country_selected` | User navigates to a country's broadcast guide | `src/pages/Watch.tsx` |
| `squad_searched` | User searches for a national team on the squads page | `src/pages/Squads.tsx` |
| `groups_view_changed` | User switches between list and table view on groups page | `src/pages/Groups.tsx` |
| `timezone_updated` | User saves a new preferred timezone from their profile | `src/pages/Profile.tsx` |
| `preferred_team_set` | User selects or changes their preferred team | `src/pages/Profile.tsx` |
| `match_reminders_toggled` | User enables or disables match reminder notifications | `src/pages/Profile.tsx` |

*Note: `sign_up` with `method: "magic_link"` was already captured in `src/pages/AuthCallback.tsx` via `trackSignUp`. The new `sign_up` capture covers the password registration path.*

## Next steps

We've built a dashboard and five insights for you to monitor user behavior:

- [Analytics basics (wizard) — Dashboard](https://eu.posthog.com/project/203923/dashboard/754402)
- [Sign-ups over time](https://eu.posthog.com/project/203923/insights/WukAMamT)
- [Auth funnel: visit → sign in](https://eu.posthog.com/project/203923/insights/juCATgr9)
- [Items saved over time](https://eu.posthog.com/project/203923/insights/UTf8EyQi)
- [Watch guide engagement](https://eu.posthog.com/project/203923/insights/6smlBuKq)
- [Content search and view engagement](https://eu.posthog.com/project/203923/insights/I0Qbj1pZ)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST` to `.env.example` and any CI/CD bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify correctly in PostHog error tracking.
- [ ] Confirm the returning-visitor path also calls `identify` — currently `identify` fires on fresh password login, password sign-up, and magic-link/OAuth callback. If a user returns on a new session without re-authenticating, their existing auth cookie will restore the `user` state in `AuthContext` via `api.getMe()` but no `identify` call is made. Add `posthog.identify()` in the `useEffect` that calls `api.getMe()` on app boot, using the restored user's ID.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-react-react-router-6/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

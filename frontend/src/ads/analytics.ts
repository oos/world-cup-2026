import posthog from "posthog-js";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;

export function isGa4Configured(): boolean {
  return Boolean(MEASUREMENT_ID);
}

export function isPostHogConfigured(): boolean {
  return Boolean(POSTHOG_KEY);
}

export function isAnalyticsConfigured(): boolean {
  return isGa4Configured() || isPostHogConfigured();
}

export function trackGa4PageView(path: string): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    send_to: MEASUREMENT_ID,
  });
}

export function trackPostHogPageView(path: string): void {
  if (!isPostHogConfigured()) return;
  posthog.capture("$pageview", { $current_url: path });
}

export function trackSignUp(method: string): void {
  if (MEASUREMENT_ID && window.gtag) {
    window.gtag("event", "sign_up", { method });
  }

  if (isPostHogConfigured()) {
    posthog.capture("sign_up", { method });
  }
}

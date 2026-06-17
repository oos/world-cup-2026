import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  isAnalyticsConfigured,
  isGa4Configured,
  setPostHogConsent,
  trackPageView,
} from "./analytics";
import { useAdConsent } from "./useAdConsent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { analyticsEnabled } = useAdConsent();
  const scriptLoaded = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (!isAnalyticsConfigured()) return;
    setPostHogConsent(analyticsEnabled);
  }, [analyticsEnabled]);

  useEffect(() => {
    if (!analyticsEnabled || !isGa4Configured() || scriptLoaded.current) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, { send_page_view: false });

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);
    scriptLoaded.current = true;
  }, [analyticsEnabled]);

  useEffect(() => {
    if (!analyticsEnabled) return;
    const path = `${location.pathname}${location.search}`;
    if (isGa4Configured() && !scriptLoaded.current) return;
    trackPageView(path);
  }, [analyticsEnabled, location.pathname, location.search]);

  return <>{children}</>;
}

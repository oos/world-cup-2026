import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  isGa4Configured,
  isPostHogConfigured,
  trackGa4PageView,
  trackPostHogPageView,
} from "./analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const scriptLoaded = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (!isGa4Configured() || scriptLoaded.current) return;

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
  }, []);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;

    if (isPostHogConfigured()) {
      trackPostHogPageView(path);
    }

    if (!isGa4Configured() || !scriptLoaded.current) return;
    trackGa4PageView(path);
  }, [location.pathname, location.search]);

  return <>{children}</>;
}

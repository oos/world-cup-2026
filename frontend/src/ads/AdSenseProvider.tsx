import { createContext, useContext, useEffect, useRef } from "react";
import { useAdConsent } from "./useAdConsent";

interface AdSenseContextValue {
  adsEnabled: boolean;
  pushAd: (element: HTMLElement) => void;
}

const AdSenseContext = createContext<AdSenseContextValue>({
  adsEnabled: false,
  pushAd: () => {},
});

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;

export function AdSenseProvider({ children }: { children: React.ReactNode }) {
  const { adsEnabled } = useAdConsent();
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (!adsEnabled || !CLIENT_ID || scriptLoaded.current) return;
    const script = document.createElement("script");
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    scriptLoaded.current = true;
  }, [adsEnabled]);

  const pushAd = (element: HTMLElement) => {
    if (!adsEnabled || !CLIENT_ID) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blockers */
    }
    void element;
  };

  return (
    <AdSenseContext.Provider value={{ adsEnabled, pushAd }}>
      {children}
    </AdSenseContext.Provider>
  );
}

export function useAdSense() {
  return useContext(AdSenseContext);
}

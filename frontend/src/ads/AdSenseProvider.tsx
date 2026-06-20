import { createContext, useContext, useEffect, useRef } from "react";

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
const adsEnabled =
  import.meta.env.VITE_ENABLE_ADS === "true" && Boolean(CLIENT_ID);

export function AdSenseProvider({ children }: { children: React.ReactNode }) {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (!adsEnabled || scriptLoaded.current) return;
    const script = document.createElement("script");
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    scriptLoaded.current = true;
  }, []);

  const pushAd = (element: HTMLElement) => {
    if (!adsEnabled) return;
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

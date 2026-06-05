import { useCallback, useEffect, useState } from "react";

const CONSENT_KEY = "wc26_ad_consent";

export type ConsentState = "pending" | "accepted" | "declined";

export function useAdConsent() {
  const [consent, setConsent] = useState<ConsentState>("pending");

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted" || stored === "declined") {
      setConsent(stored);
    }
  }, []);

  const accept = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setConsent("accepted");
  }, []);

  const decline = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setConsent("declined");
  }, []);

  const adsEnabled =
    import.meta.env.VITE_ENABLE_ADS === "true" && consent === "accepted";

  return { consent, accept, decline, adsEnabled };
}

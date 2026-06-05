import { useEffect, useRef } from "react";
import { useAdSense } from "./AdSenseProvider";

interface AdBannerProps {
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
}

export function AdBanner({
  slot,
  format = "auto",
  className = "",
}: AdBannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { adsEnabled, pushAd } = useAdSense();
  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID;
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!adsEnabled || !ref.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && ref.current) {
          pushAd(ref.current);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: "100px" }
    );
    observerRef.current.observe(ref.current);

    return () => observerRef.current?.disconnect();
  }, [adsEnabled, pushAd]);

  if (!adsEnabled || !clientId) return null;

  return (
    <div ref={ref} className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot || ""}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

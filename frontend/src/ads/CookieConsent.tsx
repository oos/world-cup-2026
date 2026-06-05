import { useAdConsent } from "./useAdConsent";

export function CookieConsent() {
  const { consent, accept, decline } = useAdConsent();

  if (consent !== "pending") return null;

  return (
    <div className="cookie-consent" role="dialog" aria-label="Cookie consent">
      <p>
        We use cookies for analytics and ads (Google AdSense). Accept to support
        the app, or decline to browse without ads.
      </p>
      <div className="cookie-consent-actions">
        <button type="button" className="btn btn-primary" onClick={accept}>
          Accept
        </button>
        <button type="button" className="btn btn-secondary" onClick={decline}>
          Decline
        </button>
      </div>
    </div>
  );
}

import { useEffect, useId } from "react";
import { Cookie, X } from "lucide-react";
import { useAdConsent, type ConsentState } from "./useAdConsent";

type CookieConsentModalProps = {
  open: boolean;
  onClose: () => void;
};

function consentLabel(consent: ConsentState) {
  if (consent === "accepted") return "Accepted";
  if (consent === "declined") return "Declined";
  return "Not set";
}

export function CookieConsentModal({ open, onClose }: CookieConsentModalProps) {
  const titleId = useId();
  const { consent, accept, decline } = useAdConsent();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleAccept = () => {
    accept();
    onClose();
  };

  const handleDecline = () => {
    decline();
    onClose();
  };

  return (
    <div className="sign-in-overlay" onClick={onClose}>
      <div
        className="sign-in-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="sign-in-close"
          aria-label="Close cookie settings"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>

        <div className="sign-in-header">
          <span className="sign-in-icon" aria-hidden="true">
            <Cookie size={22} strokeWidth={2} />
          </span>
          <h2 id={titleId}>Cookie &amp; ad consent</h2>
          <p>
            Choose whether to allow analytics and Google AdSense on this device.
          </p>
        </div>

        <div className="cookie-consent-modal-status">
          <span className="cookie-consent-modal-status-label">Current choice</span>
          <span className={`profile-status profile-status--${consent}`}>
            {consentLabel(consent)}
          </span>
        </div>

        <div className="cookie-consent-modal-actions">
          <button type="button" className="btn btn-primary" onClick={handleAccept}>
            Accept cookies
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleDecline}>
            Decline cookies
          </button>
        </div>
      </div>
    </div>
  );
}

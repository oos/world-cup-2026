import { useEffect, useId, useRef, useState } from "react";
import { LogIn, Mail, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
};

type Step = "form" | "sent";

export function SignInModal({ open, onClose }: SignInModalProps) {
  const titleId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setStep("form");
    setError(null);
    setBusy(false);

    const frame = window.requestAnimationFrame(() => {
      emailInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

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

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }

    setBusy(true);
    try {
      await signInWithEmail(trimmed);
      setStep("sent");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not send the sign-in link.",
      );
    } finally {
      setBusy(false);
    }
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
          aria-label="Close sign in"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>

        <div className="sign-in-header">
          <span className="sign-in-icon" aria-hidden="true">
            <LogIn size={22} strokeWidth={2} />
          </span>
          <h2 id={titleId}>Sign in</h2>
          <p>Save preferences and sync your profile across devices.</p>
        </div>

        {step === "sent" ? (
          <div className="sign-in-message sign-in-message--success">
            <Mail size={18} strokeWidth={2} aria-hidden="true" />
            <div>
              <strong>Check your email</strong>
              <p>
                We sent a sign-in link to <span>{email}</span>. Open it on this device
                to finish signing in.
              </p>
            </div>
          </div>
        ) : (
          <form className="sign-in-form" onSubmit={handleEmailSubmit}>
            <label className="profile-field" htmlFor="sign-in-email">
              <span className="profile-field-label">Email</span>
              <input
                ref={emailInputRef}
                id="sign-in-email"
                className="profile-field-input"
                type="email"
                value={email}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary btn-block sign-in-submit"
              disabled={busy}
            >
              {busy ? "Sending link…" : "Continue with email"}
            </button>
          </form>
        )}

        {error && <p className="sign-in-error">{error}</p>}
      </div>
    </div>
  );
}

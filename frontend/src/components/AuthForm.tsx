import { useEffect, useId, useRef, useState } from "react";
import { LogIn, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SegmentedTabs } from "./SegmentedTabs";

type AuthMode = "sign-in" | "sign-up";
type Step = "form" | "sent";
type SocialProvider = "google" | "apple" | "github";

type AuthFormProps = {
  emailInputId?: string;
  onSuccess?: () => void;
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const SOCIAL_PROVIDERS: {
  id: SocialProvider;
  label: string;
  icon: () => JSX.Element;
  className?: string;
}[] = [
  { id: "google", label: "Continue with Google", icon: GoogleIcon },
  {
    id: "apple",
    label: "Continue with Apple",
    icon: AppleIcon,
    className: "sign-in-social-btn--apple",
  },
  { id: "github", label: "Continue with GitHub", icon: GitHubIcon },
];

export function AuthForm({ emailInputId, onSuccess }: AuthFormProps) {
  const generatedId = useId();
  const resolvedEmailId = emailInputId ?? `auth-email-${generatedId}`;
  const resolvedPasswordId = `${resolvedEmailId}-password`;
  const resolvedConfirmPasswordId = `${resolvedEmailId}-confirm-password`;
  const emailInputRef = useRef<HTMLInputElement>(null);
  const { signInWithPassword, signUpWithPassword, signInWithSocial } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "form") return;
    const frame = window.requestAnimationFrame(() => {
      emailInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode, step]);

  const isSignUp = mode === "sign-up";

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
      if (isSignUp) {
        if (!password.trim()) {
          setError("Enter a password.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }

        await signUpWithPassword(trimmed, password);
        onSuccess?.();
        return;
      }

      if (!password.trim()) {
        setError("Enter your password.");
        return;
      }

      await signInWithPassword(trimmed, password);
      onSuccess?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isSignUp
            ? "Could not create your account."
            : "Could not sign in.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSocial = async (provider: SocialProvider) => {
    setError(null);
    setSocialBusy(provider);
    try {
      await signInWithSocial(provider);
    } catch (socialError) {
      setError(
        socialError instanceof Error
          ? socialError.message
          : "Could not start social sign-in.",
      );
      setSocialBusy(null);
    }
  };

  const title = isSignUp ? "Create account" : "Sign in";
  const subtitle = isSignUp
    ? "Create an account to save preferences and sync across devices."
    : "Save preferences and sync your profile across devices.";
  const submitLabel = isSignUp ? "Create account" : "Sign in";
  const busyLabel = isSignUp ? "Creating account…" : "Signing in…";
  const sentTitle = isSignUp ? "Check your email to finish signing up" : "Check your email";

  return (
    <>
      <div className="sign-in-header">
        <span className="sign-in-icon" aria-hidden="true">
          <LogIn size={22} strokeWidth={2} />
        </span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      {step === "sent" ? (
        <div className="sign-in-message sign-in-message--success">
          <Mail size={18} strokeWidth={2} aria-hidden="true" />
          <div>
            <strong>{sentTitle}</strong>
            <p>
              We sent a {isSignUp ? "confirmation" : "sign-in"} link to{" "}
              <span>{email}</span>. Open it on this device to finish{" "}
              {isSignUp ? "creating your account" : "signing in"}.
            </p>
          </div>
        </div>
      ) : (
        <>
          <SegmentedTabs
            ariaLabel="Sign in or sign up"
            tabs={[
              { id: "sign-in", label: "Sign in" },
              { id: "sign-up", label: "Sign up" },
            ]}
            value={mode}
            onChange={(nextMode) => {
              setMode(nextMode);
              setPassword("");
              setConfirmPassword("");
              setError(null);
            }}
          />

          <form className="sign-in-form" onSubmit={handleEmailSubmit}>
            <label className="profile-field" htmlFor={resolvedEmailId}>
              <span className="profile-field-label">Email</span>
              <input
                ref={emailInputRef}
                id={resolvedEmailId}
                className="profile-field-input"
                type="email"
                value={email}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={busy || Boolean(socialBusy)}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="profile-field" htmlFor={resolvedPasswordId}>
              <span className="profile-field-label">Password</span>
              <input
                id={resolvedPasswordId}
                className="profile-field-input"
                type="password"
                value={password}
                placeholder={isSignUp ? "Create a password" : "Your password"}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                disabled={busy || Boolean(socialBusy)}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {isSignUp && (
              <label className="profile-field" htmlFor={resolvedConfirmPasswordId}>
                <span className="profile-field-label">Confirm password</span>
                <input
                  id={resolvedConfirmPasswordId}
                  className="profile-field-input"
                  type="password"
                  value={confirmPassword}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  disabled={busy || Boolean(socialBusy)}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-block sign-in-submit"
              disabled={busy || Boolean(socialBusy)}
            >
              {busy ? busyLabel : submitLabel}
            </button>
          </form>

          <div className="sign-in-divider">or</div>

          <div className="sign-in-social">
            {SOCIAL_PROVIDERS.map(({ id, label, icon: Icon, className }) => (
              <button
                key={id}
                type="button"
                className={`sign-in-social-btn${className ? ` ${className}` : ""}`}
                disabled={Boolean(socialBusy) || busy}
                onClick={() => void handleSocial(id)}
              >
                <Icon />
                {socialBusy === id ? "Redirecting…" : label}
              </button>
            ))}
          </div>
        </>
      )}

      {error && <p className="sign-in-error">{error}</p>}
    </>
  );
}

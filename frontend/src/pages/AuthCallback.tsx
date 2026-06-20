import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import posthog from "posthog-js";
import { api } from "../api/client";
import { trackSignUp } from "../ads/analytics";
import {
  buildGuestMergePatch,
  readStoredGuestPreferences,
} from "../hooks/useProfilePreferences";
import { mergeGuestSavedItems } from "../hooks/useSavedItems";
import { useAuth } from "../context/AuthContext";

function parseOAuthProvider(state: string | null): "google" | "github" | null {
  if (!state) return null;
  const provider = state.split(":")[0]?.trim().toLowerCase();
  if (provider === "google" || provider === "github") return provider;
  return null;
}

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(
        oauthError === "access_denied"
          ? "Sign-in was cancelled."
          : "Social sign-in failed. Try again or use email.",
      );
      return;
    }

    const code = searchParams.get("code");
    const provider = parseOAuthProvider(searchParams.get("state"));
    const token = searchParams.get("token");

    if (!code && !token) {
      setError("Invalid or expired sign-in link.");
      return;
    }

    const exchangeKey = code ? `oauth:${provider ?? "unknown"}:${code}` : `magic:${token}`;
    if (handledKeyRef.current === exchangeKey) return;
    handledKeyRef.current = exchangeKey;

    if (code) {
      if (!provider) {
        setError("Invalid social sign-in state. Try again.");
        return;
      }

      let active = true;

      api
        .completeOAuth(provider, code)
        .then(async ({ user }) => {
          if (!active) return;

          const guest = readStoredGuestPreferences();
          const mergePatch = buildGuestMergePatch(user, guest);
          const nextUser = mergePatch ? await api.updateProfile(mergePatch) : user;
          await mergeGuestSavedItems();

          if (!active) return;
          setUser(nextUser);
          posthog.identify(String(nextUser.id), {
            email: nextUser.email,
            name: nextUser.display_name,
          });
          trackSignUp(provider);
          navigate("/profile", { replace: true });
        })
        .catch((verifyError) => {
          if (!active) return;
          setError(
            verifyError instanceof Error
              ? verifyError.message
              : "Could not complete social sign-in.",
          );
        });

      return () => {
        active = false;
      };
    }

    let active = true;

    api
      .verifyToken(token!)
      .then(async ({ user }) => {
        if (!active) return;

        const guest = readStoredGuestPreferences();
        const mergePatch = buildGuestMergePatch(user, guest);
        const nextUser = mergePatch ? await api.updateProfile(mergePatch) : user;
        await mergeGuestSavedItems();

        if (!active) return;
        setUser(nextUser);
        posthog.identify(String(nextUser.id), { email: nextUser.email, name: nextUser.display_name });
        trackSignUp("magic_link");
        navigate("/profile", { replace: true });
      })
      .catch((verifyError) => {
        if (!active) return;
        setError(
          verifyError instanceof Error
            ? verifyError.message
            : "Could not complete sign-in.",
        );
      });

    return () => {
      active = false;
    };
  }, [navigate, searchParams, setUser]);

  if (error) {
    return (
      <>
        <h1 className="page-title">Sign-in failed</h1>
        <p className="page-subtitle">{error}</p>
        <Link to="/auth" className="btn btn-primary btn-block" style={{ marginTop: "1rem" }}>
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">Signing you in</h1>
      <p className="page-subtitle">Finishing your sign-in. You will be redirected shortly.</p>
      <div className="auth-callback-status" role="status" aria-live="polite">
        <span className="auth-callback-spinner" aria-hidden="true" />
        Completing sign-in…
      </div>
    </>
  );
}

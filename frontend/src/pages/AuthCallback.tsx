import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  buildGuestMergePatch,
  readStoredGuestPreferences,
} from "../hooks/useProfilePreferences";
import { mergeGuestSavedItems } from "../hooks/useSavedItems";
import { useAuth } from "../context/AuthContext";

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Missing sign-in token.");
      return;
    }

    let active = true;

    api
      .verifyToken(token)
      .then(async ({ user }) => {
        if (!active) return;

        const guest = readStoredGuestPreferences();
        const mergePatch = buildGuestMergePatch(user, guest);
        const nextUser = mergePatch ? await api.updateProfile(mergePatch) : user;
        await mergeGuestSavedItems();

        if (!active) return;
        setUser(nextUser);
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

import { ChevronLeft } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { AuthForm } from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";
import { resolveReturnPath } from "../utils/navigation";

export function Auth() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = resolveReturnPath(searchParams.get("returnTo"), "/profile");
  const oauthError = searchParams.get("error");

  if (!loading && user) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <div className="auth-page">
      <Link to={returnTo} className="auth-page-back">
        <ChevronLeft size={18} strokeWidth={2.25} aria-hidden="true" />
        Back
      </Link>

      <div className="auth-card">
        {oauthError === "oauth_unavailable" && (
          <div className="sign-in-message sign-in-message--info auth-page-notice">
            <div>
              <strong>Social sign-in unavailable</strong>
              <p>Social login is not configured yet. Use email to sign in or sign up.</p>
            </div>
          </div>
        )}
        <AuthForm />
        <p className="auth-page-footnote">
          By continuing, you agree to save your preferences to your account.
        </p>
      </div>
    </div>
  );
}

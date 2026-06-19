import posthog from "posthog-js";
import { PostHogErrorBoundary, PostHogProvider } from "@posthog/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AdSenseProvider } from "./ads/AdSenseProvider";
import { AnalyticsProvider } from "./ads/AnalyticsProvider";
import { AppSplashDismiss } from "./components/AppSplashDismiss";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CompetitionProvider } from "./context/CompetitionContext";
import "./styles/global.css";

const posthogKey = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
const posthogHost =
  import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com";

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: "2026-01-30",
    opt_out_capturing_by_default: true,
    capture_pageview: false,
  });
}

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}

function AppErrorFallback({
  error,
}: {
  error: unknown;
  componentStack?: string | null;
}) {
  const message = error instanceof Error ? error.message : "Something went wrong";

  return (
    <div className="error" style={{ padding: "2rem" }}>
      <h1>Something went wrong</h1>
      <p>{message}</p>
      <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
        Reload page
      </button>
    </div>
  );
}

function AppRoot() {
  const { loading } = useAuth();

  return (
    <>
      <AppSplashDismiss ready={!loading} />
      <AdSenseProvider>
        <AnalyticsProvider>
          <App />
        </AnalyticsProvider>
      </AdSenseProvider>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary fallback={AppErrorFallback}>
        <BrowserRouter>
          <AuthProvider>
            <CompetitionProvider>
              <AppRoot />
            </CompetitionProvider>
          </AuthProvider>
        </BrowserRouter>
      </PostHogErrorBoundary>
    </PostHogProvider>
  </React.StrictMode>
);

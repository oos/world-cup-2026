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
      <PostHogErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <AppRoot />
          </AuthProvider>
        </BrowserRouter>
      </PostHogErrorBoundary>
    </PostHogProvider>
  </React.StrictMode>
);

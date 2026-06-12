import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AdSenseProvider } from "./ads/AdSenseProvider";
import { AppSplashDismiss } from "./components/AppSplashDismiss";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./styles/global.css";

function AppRoot() {
  const { loading } = useAuth();

  return (
    <>
      <AppSplashDismiss ready={!loading} />
      <AdSenseProvider>
        <App />
      </AdSenseProvider>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

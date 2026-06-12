import { useEffect } from "react";

export function AppSplashDismiss({ ready }: { ready: boolean }) {
  useEffect(() => {
    if (!ready) return;

    const splash = document.getElementById("app-splash");
    if (!splash) return;

    splash.classList.add("app-splash--hide");
    const timer = window.setTimeout(() => splash.remove(), 350);

    return () => window.clearTimeout(timer);
  }, [ready]);

  return null;
}

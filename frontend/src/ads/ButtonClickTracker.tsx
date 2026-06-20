import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  getPageName,
  isTrackableClickTarget,
  TRACKABLE_CLICK_SELECTOR,
  trackButtonElement,
} from "./buttonTracking";

export function ButtonClickTracker() {
  const location = useLocation();
  const pageName = getPageName(location.pathname);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const clickable = target.closest(TRACKABLE_CLICK_SELECTOR);
      if (!(clickable instanceof HTMLElement) || !isTrackableClickTarget(clickable)) return;

      trackButtonElement(pageName, clickable);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pageName]);

  return null;
}

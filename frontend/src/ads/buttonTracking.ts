import posthog from "posthog-js";
import { isValidElement, type ReactNode } from "react";
import { isPostHogConfigured } from "./analytics";

export const TRACKABLE_CLICK_SELECTOR = [
  "button",
  "[role='button']",
  "a.ui-button",
  "a.btn",
  "a.watch-suggested-btn",
  "a.profile-sign-in",
  "a.auth-page-back",
  "a.top-bar-brand",
  ".main-nav a",
  ".side-nav-link",
  ".top-bar-profile-dropdown-item",
  ".guide-link-card",
  "a.wc26-planner-promo",
  "a.hero-banner-link",
  "a.stat-chip-link",
  "a.dashboard-history-chart-link",
  "a.filter-option",
  "[data-track-button]:not([data-track-button='off'])",
].join(", ");

export function extractTextFromChildren(children: ReactNode): string {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join(" ").replace(/\s+/g, " ").trim();
  }
  if (isValidElement(children)) {
    return extractTextFromChildren(children.props.children);
  }
  return "";
}

export function slugifyTrackName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function getPageName(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/" || path === "/dashboard") return "dashboard";
  if (path === "/profile") return "profile";
  if (path === "/auth/callback") return "auth_callback";
  if (path === "/auth") return "auth";
  if (path === "/saved") return "saved";
  if (path === "/about") return "about";
  if (path === "/roadmap") return "roadmap";
  if (path === "/guide") return "guide";
  if (path === "/today") return "today";
  if (path === "/schedule") return "schedule";
  if (path === "/standings") return "standings";
  if (path === "/groups") return "groups";
  if (path === "/bracket") return "bracket";
  if (path === "/knockout-predictions") return "knockout_predictions";
  if (path === "/squads") return "squads";
  if (path === "/trends") return "trends";
  if (path === "/winners") return "winners";
  if (path === "/goal-involvements") return "goal_involvements";
  if (path === "/world-rankings") return "world_rankings";
  if (path === "/teams") return "teams";
  if (path === "/players") return "players";
  if (path === "/fixtures") return "fixtures";
  if (path === "/history") return "history";
  if (path === "/WC-2026") return "world_cup_2026";
  if (path === "/host-cities") return "host_cities";
  if (path === "/watch") return "watch";

  if (/^\/teams\/\d+\/history\/[^/]+\/[^/]+$/.test(path)) {
    return "team_world_cup_match_detail";
  }
  if (/^\/teams\/\d+$/.test(path)) return "team_detail";
  if (/^\/players\/\d+$/.test(path)) return "player_detail";
  if (/^\/fixtures\/\d+$/.test(path)) return "match_detail";
  if (/^\/history\/[^/]+\/[^/]+$/.test(path)) return "history_match_detail";
  if (/^\/watch\/[^/]+$/.test(path)) return "watch_country";

  const competitionMatch = path.match(/^\/c\/([^/]+)\/matches\/(\d+)$/);
  if (competitionMatch) return "competition_match_detail";

  const competitionTab = path.match(/^\/c\/([^/]+)\/([^/]+)$/);
  if (competitionTab) return `competition_${slugifyTrackName(competitionTab[2])}`;

  const competitionRoot = path.match(/^\/c\/([^/]+)$/);
  if (competitionRoot) return "competition";

  const fallback = slugifyTrackName(path.replace(/^\//, "").replace(/\//g, "_"));
  return fallback || "unknown";
}

export function resolveButtonName(element: HTMLElement): string {
  const explicit = element.dataset.trackButton?.trim();
  if (explicit) return slugifyTrackName(explicit);

  const section = element.closest("[data-track-section]");
  const sectionPrefix = section?.getAttribute("data-track-section")?.trim();
  const sectionSlug = sectionPrefix ? `${slugifyTrackName(sectionPrefix)}_` : "";

  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) return `${sectionSlug}${slugifyTrackName(ariaLabel)}`;

  const text = element.textContent?.trim();
  if (text) return `${sectionSlug}${slugifyTrackName(text)}`;

  const name = element.getAttribute("name")?.trim();
  if (name) return `${sectionSlug}${slugifyTrackName(name)}`;

  return `${sectionSlug}unnamed_button`;
}

export function buildButtonTrackName(page: string, button: string): string {
  return `${page}_${button}`;
}

export function trackButtonClick(page: string, button: string): void {
  if (!isPostHogConfigured()) return;

  const buttonName = buildButtonTrackName(page, button);
  posthog.capture("button_clicked", {
    button_name: buttonName,
    page,
    button,
  });
}

export function trackButtonElement(page: string, element: HTMLElement): void {
  trackButtonClick(page, resolveButtonName(element));
}

export function isTrackableClickTarget(element: HTMLElement | null): element is HTMLElement {
  if (!element) return false;
  if (element.dataset.trackButton === "off") return false;
  if (element.closest("[data-track-buttons='off']")) return false;
  if (element instanceof HTMLButtonElement && element.disabled) return false;
  if (element instanceof HTMLAnchorElement && element.getAttribute("aria-disabled") === "true") {
    return false;
  }
  return element.matches(TRACKABLE_CLICK_SELECTOR);
}

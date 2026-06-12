import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type AuthProfilePatch, type AuthUser } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ViewMode } from "../components/ViewModeToggle";

const PROFILE_KEY = "wc26_profile";
const PROFILE_UPDATED_EVENT = "wc26-profile-updated";

export type ProfilePreferences = {
  displayName: string;
  email: string;
  city: string;
  defaultViewMode: ViewMode;
  matchReminders: boolean;
};

const DEFAULT_PREFERENCES: ProfilePreferences = {
  displayName: "Guest",
  email: "",
  city: "",
  defaultViewMode: "grid",
  matchReminders: false,
};

function readGuestPreferences(): ProfilePreferences {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(stored) as Partial<ProfilePreferences>;
    return {
      displayName:
        typeof parsed.displayName === "string" && parsed.displayName.trim()
          ? parsed.displayName.trim()
          : DEFAULT_PREFERENCES.displayName,
      email: typeof parsed.email === "string" ? parsed.email : DEFAULT_PREFERENCES.email,
      city: typeof parsed.city === "string" ? parsed.city : DEFAULT_PREFERENCES.city,
      defaultViewMode:
        parsed.defaultViewMode === "list" ? "list" : DEFAULT_PREFERENCES.defaultViewMode,
      matchReminders:
        typeof parsed.matchReminders === "boolean"
          ? parsed.matchReminders
          : DEFAULT_PREFERENCES.matchReminders,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writeGuestPreferences(preferences: ProfilePreferences) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
}

function userToPreferences(user: AuthUser): ProfilePreferences {
  return {
    displayName: user.display_name || user.email.split("@")[0] || "User",
    email: user.email,
    city: user.city || "",
    defaultViewMode: user.default_view_mode === "list" ? "list" : "grid",
    matchReminders: user.match_reminders,
  };
}

function preferencesToPatch(patch: Partial<ProfilePreferences>): AuthProfilePatch {
  const payload: AuthProfilePatch = {};
  if (patch.displayName !== undefined) payload.display_name = patch.displayName;
  if (patch.city !== undefined) payload.city = patch.city;
  if (patch.defaultViewMode !== undefined) payload.default_view_mode = patch.defaultViewMode;
  if (patch.matchReminders !== undefined) payload.match_reminders = patch.matchReminders;
  return payload;
}

export function readStoredGuestPreferences() {
  return readGuestPreferences();
}

export function useProfilePreferences() {
  const { user, setUser } = useAuth();
  const [guestPreferences, setGuestPreferences] = useState<ProfilePreferences>(
    readGuestPreferences,
  );

  useEffect(() => {
    const syncPreferences = () => setGuestPreferences(readGuestPreferences());
    window.addEventListener(PROFILE_UPDATED_EVENT, syncPreferences);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, syncPreferences);
  }, []);

  const preferences = useMemo(
    () => (user ? userToPreferences(user) : guestPreferences),
    [user, guestPreferences],
  );

  const updatePreferences = useCallback(
    (patch: Partial<ProfilePreferences>) => {
      if (user) {
        void api.updateProfile(preferencesToPatch(patch)).then((nextUser) => {
          setUser(nextUser);
        });
        return;
      }

      setGuestPreferences((current) => {
        const next = { ...current, ...patch };
        writeGuestPreferences(next);
        return next;
      });
    },
    [user, setUser],
  );

  const resetPreferences = useCallback(() => {
    writeGuestPreferences(DEFAULT_PREFERENCES);
    setGuestPreferences(DEFAULT_PREFERENCES);
  }, []);

  return { preferences, updatePreferences, resetPreferences };
}

export function getProfileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function buildGuestMergePatch(
  user: AuthUser,
  guest: ProfilePreferences,
): AuthProfilePatch | null {
  const patch: AuthProfilePatch = {};

  if (!user.display_name && guest.displayName !== "Guest") {
    patch.display_name = guest.displayName;
  }
  if (!user.city && guest.city) {
    patch.city = guest.city;
  }
  if (user.default_view_mode === "grid" && guest.defaultViewMode === "list") {
    patch.default_view_mode = guest.defaultViewMode;
  }
  if (!user.match_reminders && guest.matchReminders) {
    patch.match_reminders = guest.matchReminders;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

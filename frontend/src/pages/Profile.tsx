import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LogIn, LogOut, MapPin, Settings, Shield, ShieldAlert } from "lucide-react";
import posthog from "posthog-js";
import { Link } from "react-router-dom";
import { api, type Team } from "../api/client";
import { CookieConsentModal } from "../ads/CookieConsentModal";
import { useAdConsent } from "../ads/useAdConsent";
import { PreferredTeamModal } from "../components/PreferredTeamModal";
import { MatchReminderTimesEditor } from "../components/MatchReminderTimesEditor";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { TeamFlag } from "../components/TeamFlag";
import { TimezoneModal } from "../components/TimezoneModal";
import {
  getAuthDisplayName,
  useAuth,
} from "../context/AuthContext";
import { useDeviceLocation } from "../hooks/useDeviceLocation";
import {
  getProfileInitials,
  useProfilePreferences,
} from "../hooks/useProfilePreferences";
import { usePushNotifications } from "../hooks/usePushNotifications";
import {
  formatPreferredTeamLabel,
  resolvePreferredTeamFifaCode,
} from "../utils/cityTeams";
import {
  CITY_TIMEZONE_OPTIONS,
  formatResolvedTimezoneLabel,
} from "../utils/cityTimezones";

type ProfileTab = "account" | "preferences" | "privacy";

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="profile-section">
      <h2 className="profile-section-title">{title}</h2>
      <div className="profile-card">{children}</div>
    </section>
  );
}

function ProfileRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="profile-row">
      <div className="profile-row-copy">
        <div className="profile-row-label">{label}</div>
        {description && <div className="profile-row-description">{description}</div>}
      </div>
      <div className="profile-row-control">{children}</div>
    </div>
  );
}

function ProfileField({
  id,
  label,
  type = "text",
  value,
  placeholder,
  readOnly = false,
  onChange,
}: {
  id: string;
  label: string;
  type?: "text" | "email";
  value: string;
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="profile-field" htmlFor={id}>
      <span className="profile-field-label">{label}</span>
      <input
        id={id}
        className="profile-field-input"
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        autoComplete={type === "email" ? "email" : "name"}
      />
    </label>
  );
}

function ProfileSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="profile-field" htmlFor={id}>
      <span className="profile-field-label">{label}</span>
      <select
        id={id}
        className="profile-field-input profile-field-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`profile-toggle ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="profile-toggle-thumb" aria-hidden="true" />
    </button>
  );
}

export function Profile() {
  const { user, signOut } = useAuth();
  const { preferences, updatePreferences, resetPreferences } = useProfilePreferences();
  const {
    supported: locationSupported,
    permission: locationPermission,
    loading: locationLoading,
    error: locationError,
    detectCity,
  } = useDeviceLocation();
  const { setEnabled, syncReminderMinutes, loading: pushLoading, error: pushError } =
    usePushNotifications();
  const { consent } = useAdConsent();
  const [activeTab, setActiveTab] = useState<ProfileTab>("account");
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [timezoneModalOpen, setTimezoneModalOpen] = useState(false);
  const [preferredTeamModalOpen, setPreferredTeamModalOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTeams()
      .then((response) => setTeams(response.teams))
      .catch(() => setTeams([]));
  }, []);

  const isSignedIn = Boolean(user);
  const authDisplayName = getAuthDisplayName(user);
  const displayName = isSignedIn
    ? authDisplayName || preferences.displayName
    : preferences.displayName;
  const email = isSignedIn ? user?.email || preferences.email : preferences.email;
  const timezoneLabel = formatResolvedTimezoneLabel(
    preferences.city,
    preferences.timezone,
  );
  const preferredTeamFifaCode = resolvePreferredTeamFifaCode(
    preferences.city,
    preferences.preferredTeamFifaCode,
  );
  const preferredTeam = useMemo(
    () => teams.find((team) => team.fifa_code === preferredTeamFifaCode),
    [teams, preferredTeamFifaCode],
  );
  const preferredTeamLabel = formatPreferredTeamLabel(
    preferences.city,
    preferences.preferredTeamFifaCode,
    preferredTeam?.name,
  );
  const biometricsSupported =
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined";

  const consentLabel =
    consent === "accepted"
      ? "Accepted"
      : consent === "declined"
        ? "Declined"
        : "Not set";

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : "Could not sign out. Try again.",
      );
    }
  };

  const handleUseLocation = () => {
    void detectCity().then((city) => {
      if (city) updatePreferences({ city });
    });
  };

  const locationBlocked = locationPermission === "denied";
  const locationUnavailable = !locationSupported || locationPermission === "unsupported";

  return (
    <>
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">Your account and preferences</p>

      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {getProfileInitials(displayName)}
        </div>
        <div className="profile-header-copy">
          <h2>{displayName}</h2>
          <p>{email || "No email added"}</p>
          <span
            className={`profile-badge ${isSignedIn ? "profile-badge--signed-in" : ""}`}
          >
            {isSignedIn ? "Email account" : "Guest account"}
          </span>
        </div>
      </div>

      {isSignedIn ? (
        <button type="button" className="profile-sign-in profile-sign-out" onClick={handleSignOut}>
          <LogOut size={18} strokeWidth={2} aria-hidden="true" />
          Sign out
        </button>
      ) : (
        <Link to="/auth?returnTo=/profile" className="profile-sign-in profile-sign-in--active">
          <LogIn size={18} strokeWidth={2} aria-hidden="true" />
          Sign in or create account
        </Link>
      )}

      {signOutError && <p className="sign-in-error profile-sign-out-error">{signOutError}</p>}

      <div className="profile-tabs">
        <SegmentedTabs
          ariaLabel="Profile sections"
          tabs={[
            { id: "account", label: "Account" },
            { id: "preferences", label: "Preferences" },
            { id: "privacy", label: "Privacy" },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "account" ? (
          <div className="profile-panel" role="tabpanel" aria-label="Account">
            <ProfileSection title="Account">
              <ProfileField
                id="profile-display-name"
                label="Display name"
                value={preferences.displayName}
                placeholder="Your name"
                onChange={(displayName) => updatePreferences({ displayName })}
              />
              <ProfileField
                id="profile-email"
                label="Email"
                type="email"
                value={email}
                placeholder="you@example.com"
                readOnly={isSignedIn}
                onChange={isSignedIn ? undefined : (email) => updatePreferences({ email })}
              />
            </ProfileSection>

            <ProfileSection title="Security">
              <ProfileRow
                label="Biometrics"
                description="Use Face ID, Touch ID, or your device fingerprint to unlock the app."
              >
                <SegmentedTabs
                  tabs={[
                    { id: "yes", label: "Yes" },
                    { id: "no", label: "No" },
                  ]}
                  value={preferences.biometricsEnabled ? "yes" : "no"}
                  onChange={(value) =>
                    updatePreferences({ biometricsEnabled: value === "yes" })
                  }
                  ariaLabel="Biometrics"
                />
              </ProfileRow>
              {!biometricsSupported && (
                <p className="profile-footnote profile-security-note">
                  Biometrics are not available on this device or browser.
                </p>
              )}
            </ProfileSection>
          </div>
        ) : activeTab === "preferences" ? (
          <div className="profile-panel" role="tabpanel" aria-label="Preferences">
            <ProfileSection title="Preferences">
              <div id="profile-location">
                <ProfileSelect
                  id="profile-city"
                  label="Home city"
                  value={preferences.city}
                  options={[
                    { value: "", label: "Select your city" },
                    ...CITY_TIMEZONE_OPTIONS.map((option) => ({
                      value: option.city,
                      label: option.city,
                    })),
                  ]}
                  onChange={(city) => updatePreferences({ city })}
                />
                <div className="profile-location-action">
                  {locationBlocked && (
                    <div className="profile-location-callout" role="alert">
                      <span className="profile-location-callout-icon" aria-hidden="true">
                        <ShieldAlert size={20} strokeWidth={2.1} />
                      </span>
                      <div className="profile-location-callout-copy">
                        <strong>Location access is blocked</strong>
                        <p>
                          Turn on location for this site in your browser settings to
                          auto-detect your home city and timezone.
                        </p>
                        <p className="profile-location-callout-steps">
                          Open site settings → Permissions → Location → Allow, then tap
                          “Try again” below.
                        </p>
                      </div>
                    </div>
                  )}

                  {locationUnavailable && (
                    <div
                      className="profile-location-callout profile-location-callout--muted"
                      role="status"
                    >
                      <span className="profile-location-callout-icon" aria-hidden="true">
                        <ShieldAlert size={20} strokeWidth={2.1} />
                      </span>
                      <div className="profile-location-callout-copy">
                        <strong>Location is not available</strong>
                        <p>
                          This device or browser does not support location detection.
                          Choose your home city manually instead.
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className={`profile-location-btn ${
                      locationBlocked ? "profile-location-btn--blocked" : ""
                    }`}
                    disabled={locationUnavailable || locationLoading}
                    onClick={handleUseLocation}
                  >
                    <MapPin size={16} strokeWidth={2.25} aria-hidden="true" />
                    {locationLoading
                      ? "Detecting location…"
                      : locationBlocked
                        ? "Try again"
                        : "Use my location"}
                  </button>

                  {!locationBlocked && !locationUnavailable && (
                    <p className="profile-location-note">
                      Your browser will ask for permission before sharing your location.
                    </p>
                  )}

                  {locationError && !locationBlocked && (
                    <p className="sign-in-error profile-location-error">{locationError}</p>
                  )}
                </div>
                <ProfileRow
                  label="Timezone"
                  description="Match times are shown in this timezone across the app."
                >
                  <div className="profile-status-control">
                    <span className="profile-meta">{timezoneLabel}</span>
                    <button
                      type="button"
                      className="profile-settings-btn"
                      aria-label="Change preferred timezone"
                      onClick={() => setTimezoneModalOpen(true)}
                    >
                      <Settings size={16} strokeWidth={2.25} aria-hidden="true" />
                    </button>
                  </div>
                </ProfileRow>
                <ProfileRow
                  label="Preferred team"
                  description="Used to personalize your experience across the app."
                >
                  <div className="profile-status-control">
                    <span className="profile-preferred-team-label">
                      {preferredTeamFifaCode ? (
                        <>
                          <TeamFlag
                            fifaCode={preferredTeamFifaCode}
                            teamName={preferredTeam?.name}
                            variant="badge"
                            className="profile-preferred-team-flag"
                          />
                          <span className="profile-meta">{preferredTeamLabel}</span>
                        </>
                      ) : (
                        <span className="profile-meta">Not set</span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="profile-settings-btn"
                      aria-label="Change preferred team"
                      onClick={() => setPreferredTeamModalOpen(true)}
                    >
                      <Settings size={16} strokeWidth={2.25} aria-hidden="true" />
                    </button>
                  </div>
                </ProfileRow>
              </div>
              <ProfileRow
                label="Default teams view"
                description="How teams appear when you open the teams page."
              >
                <SegmentedTabs
                  tabs={[
                    { id: "grid", label: "Grid" },
                    { id: "list", label: "List" },
                  ]}
                  value={preferences.defaultViewMode}
                  onChange={(defaultViewMode) => updatePreferences({ defaultViewMode })}
                  ariaLabel="Default teams view"
                />
              </ProfileRow>
              <ProfileRow
                label="Match reminders"
                description="Get notified on this device before kickoff and when matches start."
              >
                <ToggleSwitch
                  checked={preferences.matchReminders}
                  onChange={(matchReminders) => {
                    posthog.capture("match_reminders_toggled", { enabled: matchReminders });
                    void setEnabled(matchReminders);
                  }}
                  label="Match reminders"
                />
              </ProfileRow>
              {preferences.matchReminders && (
                <MatchReminderTimesEditor
                  minutes={preferences.matchReminderMinutes}
                  disabled={pushLoading}
                  onChange={(matchReminderMinutes) => {
                    void syncReminderMinutes(matchReminderMinutes);
                  }}
                />
              )}
              {pushError && <p className="sign-in-error profile-push-error">{pushError}</p>}
              {pushLoading && <p className="profile-footnote">Updating notification settings…</p>}
            </ProfileSection>
          </div>
        ) : (
          <div className="profile-panel" role="tabpanel" aria-label="Privacy">
            <ProfileSection title="Privacy">
              <ProfileRow
                label="Cookie & ad consent"
                description="Controls analytics and Google AdSense on this device."
              >
                <div className="profile-status-control">
                  <span className={`profile-status profile-status--${consent}`}>
                    {consentLabel}
                  </span>
                  <button
                    type="button"
                    className="profile-settings-btn"
                    aria-label="Change cookie consent"
                    onClick={() => setConsentModalOpen(true)}
                  >
                    <Settings size={16} strokeWidth={2.25} aria-hidden="true" />
                  </button>
                </div>
              </ProfileRow>
            </ProfileSection>

            <section className="profile-section">
              <button
                type="button"
                className="profile-reset"
                onClick={() => {
                  if (window.confirm("Reset your local profile and preferences on this device?")) {
                    resetPreferences();
                  }
                }}
              >
                Reset local profile
              </button>
              <p className="profile-footnote">
                <Shield size={14} strokeWidth={2} aria-hidden="true" />
                {isSignedIn
                  ? "Preferences sync to your account and follow you across devices."
                  : "Profile data is stored locally in your browser until you sign in."}
              </p>
            </section>
          </div>
        )}
      </div>

      <CookieConsentModal
        open={consentModalOpen}
        onClose={() => setConsentModalOpen(false)}
      />
      <TimezoneModal
        open={timezoneModalOpen}
        onClose={() => setTimezoneModalOpen(false)}
        city={preferences.city}
        timezone={preferences.timezone}
        onSave={(timezone) => {
          posthog.capture("timezone_updated", { timezone });
          updatePreferences({ timezone });
        }}
      />
      <PreferredTeamModal
        open={preferredTeamModalOpen}
        onClose={() => setPreferredTeamModalOpen(false)}
        city={preferences.city}
        preferredTeamFifaCode={preferences.preferredTeamFifaCode}
        teams={teams}
        onSave={(preferredTeamFifaCode) => {
          posthog.capture("preferred_team_set", { fifa_code: preferredTeamFifaCode });
          updatePreferences({ preferredTeamFifaCode });
        }}
      />
    </>
  );
}

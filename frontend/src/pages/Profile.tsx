import { useState, type ReactNode } from "react";
import { ChevronRight, LogIn, LogOut, Shield, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAdConsent } from "../ads/useAdConsent";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { SignInModal } from "../components/SignInModal";
import {
  getAuthDisplayName,
  useAuth,
} from "../context/AuthContext";
import {
  getProfileInitials,
  useProfilePreferences,
} from "../hooks/useProfilePreferences";
import { usePushNotifications } from "../hooks/usePushNotifications";
import {
  CITY_TIMEZONE_OPTIONS,
  formatTimezoneLabel,
  resolveUserTimezone,
} from "../utils/cityTimezones";

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
  const { setEnabled, loading: pushLoading, error: pushError } = usePushNotifications();
  const { consent, accept, decline } = useAdConsent();
  const [signInOpen, setSignInOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const isSignedIn = Boolean(user);
  const authDisplayName = getAuthDisplayName(user);
  const displayName = isSignedIn
    ? authDisplayName || preferences.displayName
    : preferences.displayName;
  const email = isSignedIn ? user?.email || preferences.email : preferences.email;
  const userTimezone = resolveUserTimezone(preferences.city);
  const timezoneLabel = formatTimezoneLabel(userTimezone, preferences.city || undefined);

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
        <button
          type="button"
          className="profile-sign-in profile-sign-in--active"
          onClick={() => setSignInOpen(true)}
        >
          <LogIn size={18} strokeWidth={2} aria-hidden="true" />
          Sign in with email
        </button>
      )}

      {signOutError && <p className="sign-in-error profile-sign-out-error">{signOutError}</p>}

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
          <ProfileRow
            label="Timezone"
            description="Match times are shown in this timezone across the app."
          >
            <span className="profile-meta">{timezoneLabel}</span>
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
              void setEnabled(matchReminders);
            }}
            label="Match reminders"
          />
        </ProfileRow>
        {pushError && <p className="sign-in-error profile-push-error">{pushError}</p>}
        {pushLoading && <p className="profile-footnote">Updating notification settings…</p>}
      </ProfileSection>

      <ProfileSection title="Saved items">
        <div className="profile-empty">
          <UserRound size={28} strokeWidth={1.75} aria-hidden="true" />
          <p>No saved teams or players yet.</p>
          <Link to="/teams" className="profile-link">
            Browse teams
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
          </Link>
        </div>
      </ProfileSection>

      <ProfileSection title="Privacy">
        <ProfileRow
          label="Cookie & ad consent"
          description="Controls analytics and Google AdSense on this device."
        >
          <span className={`profile-status profile-status--${consent}`}>{consentLabel}</span>
        </ProfileRow>
        <div className="profile-actions">
          <button type="button" className="btn btn-primary" onClick={accept}>
            Accept cookies
          </button>
          <button type="button" className="btn btn-secondary" onClick={decline}>
            Decline cookies
          </button>
        </div>
      </ProfileSection>

      <ProfileSection title="About">
        <ProfileRow label="App">
          <span className="profile-meta">World Cup 2026 Stats</span>
        </ProfileRow>
        <ProfileRow label="Version">
          <span className="profile-meta">1.0.0</span>
        </ProfileRow>
        <ProfileRow label="Data">
          <span className="profile-meta">2026 squads &amp; tournament history</span>
        </ProfileRow>
        <Link to="/dashboard" className="profile-nav-link">
          <span>Back to dashboard</span>
          <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
        </Link>
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

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </>
  );
}

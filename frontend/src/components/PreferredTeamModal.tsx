import { useEffect, useId, useMemo, useState } from "react";
import { Flag, X } from "lucide-react";
import type { Team } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import {
  formatPreferredTeamLabel,
  getDefaultTeamFifaCodeForCity,
  resolvePreferredTeamFifaCode,
  toPreferredTeamPreference,
} from "../utils/cityTeams";

type PreferredTeamModalProps = {
  open: boolean;
  onClose: () => void;
  city: string;
  preferredTeamFifaCode: string;
  teams: Team[];
  onSave: (preferredTeamFifaCode: string) => void;
};

export function PreferredTeamModal({
  open,
  onClose,
  city,
  preferredTeamFifaCode,
  teams,
  onSave,
}: PreferredTeamModalProps) {
  const titleId = useId();
  const selectId = useId();
  const cityDefault = getDefaultTeamFifaCodeForCity(city);
  const effectiveFifaCode = resolvePreferredTeamFifaCode(city, preferredTeamFifaCode);
  const effectiveTeam = teams.find((team) => team.fifa_code === effectiveFifaCode);
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );
  const [draftFifaCode, setDraftFifaCode] = useState(effectiveFifaCode);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const fallback = sortedTeams.some((team) => team.fifa_code === effectiveFifaCode)
      ? effectiveFifaCode
      : sortedTeams.find((team) => team.fifa_code === cityDefault)?.fifa_code ??
        sortedTeams[0]?.fifa_code ??
        "";
    setDraftFifaCode(fallback);
  }, [open, effectiveFifaCode, cityDefault, sortedTeams]);

  if (!open) return null;

  const handleSave = () => {
    if (!draftFifaCode) return;
    onSave(toPreferredTeamPreference(city, draftFifaCode));
    onClose();
  };

  const handleUseCityDefault = () => {
    onSave("");
    onClose();
  };

  return (
    <div className="sign-in-overlay" onClick={onClose}>
      <div
        className="sign-in-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="sign-in-close"
          aria-label="Close preferred team settings"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>

        <div className="sign-in-header">
          <span className="sign-in-icon" aria-hidden="true">
            <Flag size={22} strokeWidth={2} />
          </span>
          <h2 id={titleId}>Preferred team</h2>
          <p>
            Your home city picks a team by default. Choose a different nation if you
            prefer.
          </p>
        </div>

        <div className="timezone-modal-current preferred-team-modal-current">
          <span className="timezone-modal-current-label">Currently selected</span>
          <span className="profile-preferred-team-label">
            {effectiveFifaCode ? (
              <>
                <TeamFlag
                  fifaCode={effectiveFifaCode}
                  teamName={effectiveTeam?.name}
                  variant="badge"
                  className="profile-preferred-team-flag"
                />
                <span className="profile-meta">
                  {formatPreferredTeamLabel(city, preferredTeamFifaCode, effectiveTeam?.name)}
                </span>
              </>
            ) : (
              <span className="profile-meta">Not set</span>
            )}
          </span>
        </div>

        <label className="profile-field timezone-modal-field" htmlFor={selectId}>
          <span className="profile-field-label">Team</span>
          <select
            id={selectId}
            className="profile-field-input profile-field-select"
            value={draftFifaCode}
            onChange={(event) => setDraftFifaCode(event.target.value)}
            disabled={sortedTeams.length === 0}
          >
            {sortedTeams.map((team) => (
              <option key={team.id} value={team.fifa_code}>
                {team.name}
                {cityDefault === team.fifa_code ? " · city default" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="timezone-modal-actions">
          {city && cityDefault && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleUseCityDefault}
            >
              Use city default
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!draftFifaCode}
          >
            Save team
          </button>
        </div>
      </div>
    </div>
  );
}

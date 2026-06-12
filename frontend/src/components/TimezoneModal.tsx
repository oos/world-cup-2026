import { useEffect, useId, useMemo, useState } from "react";
import { Clock, X } from "lucide-react";
import {
  formatTimezoneLabel,
  getTimezoneForCity,
  getTimezoneOptions,
  resolveUserTimezone,
  toTimezonePreference,
} from "../utils/cityTimezones";

type TimezoneModalProps = {
  open: boolean;
  onClose: () => void;
  city: string;
  timezone: string;
  onSave: (timezone: string) => void;
};

export function TimezoneModal({
  open,
  onClose,
  city,
  timezone,
  onSave,
}: TimezoneModalProps) {
  const titleId = useId();
  const selectId = useId();
  const options = useMemo(() => getTimezoneOptions(), []);
  const cityDefault = city ? getTimezoneForCity(city) : undefined;
  const effectiveTimezone = resolveUserTimezone(city, timezone);
  const [draftTimezone, setDraftTimezone] = useState(effectiveTimezone);

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
    if (open) {
      setDraftTimezone(effectiveTimezone);
    }
  }, [open, effectiveTimezone]);

  if (!open) return null;

  const handleSave = () => {
    onSave(toTimezonePreference(city, draftTimezone));
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
          aria-label="Close timezone settings"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>

        <div className="sign-in-header">
          <span className="sign-in-icon" aria-hidden="true">
            <Clock size={22} strokeWidth={2} />
          </span>
          <h2 id={titleId}>Preferred timezone</h2>
          <p>
            Match times use your home city by default. Choose a different timezone if
            you prefer.
          </p>
        </div>

        <div className="timezone-modal-current">
          <span className="timezone-modal-current-label">Currently showing</span>
          <span className="profile-meta">{formatTimezoneLabel(effectiveTimezone)}</span>
        </div>

        <label className="profile-field timezone-modal-field" htmlFor={selectId}>
          <span className="profile-field-label">Timezone</span>
          <select
            id={selectId}
            className="profile-field-input profile-field-select"
            value={draftTimezone}
            onChange={(event) => setDraftTimezone(event.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {cityDefault === option.value ? " · city default" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="timezone-modal-actions">
          {city && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleUseCityDefault}
            >
              Use city default
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save timezone
          </button>
        </div>
      </div>
    </div>
  );
}

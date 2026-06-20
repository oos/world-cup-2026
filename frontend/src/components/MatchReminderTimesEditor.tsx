import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  formatReminderMinutes,
  MATCH_REMINDER_PRESETS,
  MAX_MATCH_REMINDERS,
  normalizeMatchReminderMinutes,
} from "../utils/matchReminderTimes";

type MatchReminderTimesEditorProps = {
  minutes: number[];
  disabled?: boolean;
  onChange: (minutes: number[]) => void;
};

export function MatchReminderTimesEditor({
  minutes,
  disabled = false,
  onChange,
}: MatchReminderTimesEditorProps) {
  const [selectedPreset, setSelectedPreset] = useState("");
  const sortedMinutes = [...minutes].sort((a, b) => b - a);
  const availablePresets = MATCH_REMINDER_PRESETS.filter(
    (preset) => !minutes.includes(preset),
  );
  const canAddMore = minutes.length < MAX_MATCH_REMINDERS && availablePresets.length > 0;

  const handleAdd = () => {
    const preset = Number(selectedPreset);
    if (!selectedPreset || Number.isNaN(preset) || minutes.includes(preset)) return;
    onChange(normalizeMatchReminderMinutes([...minutes, preset]));
    setSelectedPreset("");
  };

  const handleRemove = (value: number) => {
    if (minutes.length <= 1) return;
    onChange(normalizeMatchReminderMinutes(minutes.filter((minute) => minute !== value)));
  };

  return (
    <div className="match-reminder-times">
      <p className="match-reminder-times-label">Remind me before kickoff</p>
      <ul className="match-reminder-times-list">
        {sortedMinutes.map((minute) => (
          <li key={minute} className="match-reminder-times-item">
            <span>{formatReminderMinutes(minute)}</span>
            <button
              type="button"
              className="match-reminder-times-remove"
              aria-label={`Remove ${formatReminderMinutes(minute)} reminder`}
              data-track-button={`remove_reminder_${minute}m`}
              disabled={disabled || minutes.length <= 1}
              onClick={() => handleRemove(minute)}
            >
              <X size={14} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {canAddMore && (
        <div className="match-reminder-times-add">
          <select
            className="profile-field-input profile-field-select match-reminder-times-select"
            value={selectedPreset}
            disabled={disabled}
            aria-label="Reminder time to add"
            onChange={(event) => setSelectedPreset(event.target.value)}
          >
            <option value="">Add a reminder…</option>
            {availablePresets.map((preset) => (
              <option key={preset} value={preset}>
                {formatReminderMinutes(preset)} before
              </option>
            ))}
          </select>
          <button
            type="button"
            className="match-reminder-times-add-btn"
            disabled={disabled || !selectedPreset}
            data-track-button="add_reminder_time"
            onClick={handleAdd}
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
            Add
          </button>
        </div>
      )}
    </div>
  );
}

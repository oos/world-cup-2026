import { useRef } from "react";

function parseDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(iso: string, delta: number): string {
  const next = parseDate(iso);
  next.setDate(next.getDate() + delta);
  return toIso(next);
}

function formatDisplayDate(iso: string): string {
  return parseDate(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type DatePickerProps = {
  value: string;
  min?: string;
  max?: string;
  onChange: (date: string) => void;
};

export function DatePicker({ value, min, max, onChange }: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const canGoPrev = !min || value > min;
  const canGoNext = !max || value < max;

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  };

  return (
    <div className="date-picker">
      <button
        type="button"
        className="date-picker-arrow"
        aria-label="Previous day"
        disabled={!canGoPrev}
        onClick={() => onChange(addDays(value, -1))}
      >
        ‹
      </button>
      <button
        type="button"
        className="date-picker-value"
        aria-label="Select date"
        onClick={openPicker}
      >
        {formatDisplayDate(value)}
        <input
          ref={inputRef}
          type="date"
          className="date-picker-input"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          tabIndex={-1}
          aria-hidden
        />
      </button>
      <button
        type="button"
        className="date-picker-arrow"
        aria-label="Next day"
        disabled={!canGoNext}
        onClick={() => onChange(addDays(value, 1))}
      >
        ›
      </button>
    </div>
  );
}

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pause,
  Play,
} from "lucide-react";

type HistoryTimelineBarProps = {
  years: number[];
  frameIndex: number;
  playing: boolean;
  speed: number;
  canDecreaseSpeed: boolean;
  canIncreaseSpeed: boolean;
  onFrameSelect: (index: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onSpeedDecrease: () => void;
  onSpeedIncrease: () => void;
};

function formatSpeed(speed: number) {
  return Number.isInteger(speed) ? `${speed}` : speed.toFixed(2).replace(/0$/, "");
}

export function HistoryTimelineBar({
  years,
  frameIndex,
  playing,
  speed,
  canDecreaseSpeed,
  canIncreaseSpeed,
  onFrameSelect,
  onPlayingChange,
  onSpeedDecrease,
  onSpeedIncrease,
}: HistoryTimelineBarProps) {
  if (years.length === 0) return null;

  const currentYear = years[frameIndex] ?? years[years.length - 1];
  const canGoPrevious = frameIndex > 0;
  const canGoNext = frameIndex < years.length - 1;

  const goToPrevious = () => {
    if (!canGoPrevious) return;
    onFrameSelect(frameIndex - 1);
    onPlayingChange(false);
  };

  const goToNext = () => {
    if (!canGoNext) return;
    onFrameSelect(frameIndex + 1);
    onPlayingChange(false);
  };

  return (
    <section
      className="history-timeline-bar"
      aria-label="World Cup history timeline"
    >
      <div className="history-timeline-bar-main">
        <div className="history-timeline-bar-year" aria-live="polite">
          <span className="history-timeline-bar-year-label">
            <span>World</span>
            <span>Cup</span>
          </span>
          <span className="history-timeline-bar-year-value">{currentYear}</span>
        </div>
        <div className="history-timeline-bar-actions">
          <div className="history-timeline-bar-year-nav">
            <button
              type="button"
              className="history-timeline-btn history-timeline-btn--step"
              onClick={goToPrevious}
              disabled={!canGoPrevious}
              aria-label="Previous tournament year"
            >
              <ChevronLeft size={18} strokeWidth={2.25} aria-hidden />
            </button>
            <button
              type="button"
              className="history-timeline-btn history-timeline-btn--play"
              onClick={() => onPlayingChange(!playing)}
              aria-pressed={playing}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause size={17} strokeWidth={2.5} aria-hidden />
              ) : (
                <Play size={17} strokeWidth={2.5} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="history-timeline-btn history-timeline-btn--step"
              onClick={goToNext}
              disabled={!canGoNext}
              aria-label="Next tournament year"
            >
              <ChevronRight size={18} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <div className="history-timeline-bar-speed" aria-label="Playback speed">
            <button
              type="button"
              className="history-timeline-btn history-timeline-btn--speed"
              onClick={onSpeedIncrease}
              disabled={!canIncreaseSpeed}
              aria-label="Faster"
            >
              <ChevronUp size={15} strokeWidth={2.5} aria-hidden />
            </button>
            <span className="history-timeline-bar-speed-value">{formatSpeed(speed)}×</span>
            <button
              type="button"
              className="history-timeline-btn history-timeline-btn--speed"
              onClick={onSpeedDecrease}
              disabled={!canDecreaseSpeed}
              aria-label="Slower"
            >
              <ChevronDown size={15} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {years.length > 1 && (
        <div className="history-timeline-bar-progress">
          {years.map((year, index) => (
            <button
              key={year}
              type="button"
              className={`history-timeline-bar-dot ${
                index === frameIndex ? "active" : ""
              } ${index < frameIndex ? "complete" : ""}`}
              onClick={() => {
                onFrameSelect(index);
                onPlayingChange(false);
              }}
              aria-label={`Show ${year}`}
              aria-current={index === frameIndex ? "step" : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

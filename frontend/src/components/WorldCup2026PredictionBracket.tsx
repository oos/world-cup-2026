import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Match, Team } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import {
  buildPredictionBracket,
  determineWinnerSide,
  getMatchGridRow,
  getMatchGridSpan,
  KNOCKOUT_PREDICTIONS_KEY,
  loadStoredPredictions,
  prunePredictionsAfterChange,
  saveStoredPredictions,
  seedPredictionsFromMatches,
  type BracketParticipant,
  type PredictionBracketMatch,
  type PredictionScore,
} from "../utils/worldCup2026PredictionBracket";

function parseScoreInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function PredictionTeamRow({
  participant,
  scoreValue,
  penValue,
  showPen,
  side,
  winnerSide,
  disabled,
  onScoreChange,
  onPenChange,
}: {
  participant: BracketParticipant;
  scoreValue: string;
  penValue: string;
  showPen: boolean;
  side: "team1" | "team2";
  winnerSide: "team1" | "team2" | null;
  disabled: boolean;
  onScoreChange: (value: string) => void;
  onPenChange: (value: string) => void;
}) {
  const isWinner = winnerSide === side;
  const isLoser = winnerSide !== null && winnerSide !== side;
  const displayName = participant.name ?? participant.label;

  return (
    <div
      className={[
        "wc26-prediction-team",
        isWinner ? "is-winner" : "",
        isLoser ? "is-loser" : "",
        !participant.isResolved ? "is-unresolved" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <TeamFlag
        fifaCode={participant.fifaCode}
        teamName={participant.name}
        variant="badge"
        className="wc26-prediction-flag"
      />
      <span className="wc26-prediction-name">{displayName}</span>
      <div className="wc26-prediction-score-inputs">
        {showPen ? (
          <span className="wc26-prediction-pens">
            (
            <input
              type="number"
              min={0}
              max={20}
              inputMode="numeric"
              className="wc26-prediction-input wc26-prediction-input--pen"
              value={penValue}
              disabled={disabled}
              onChange={(event) => onPenChange(event.target.value)}
              aria-label={`${displayName} penalties`}
            />
            )
          </span>
        ) : null}
        <input
          type="number"
          min={0}
          max={20}
          inputMode="numeric"
          className="wc26-prediction-input"
          value={scoreValue}
          disabled={disabled}
          onChange={(event) => onScoreChange(event.target.value)}
          aria-label={`${displayName} score`}
        />
      </div>
    </div>
  );
}

function PredictionMatchCard({
  match,
  onChange,
}: {
  match: PredictionBracketMatch;
  onChange: (matchNumber: number, score: PredictionScore | null) => void;
}) {
  const disabled = !match.team1.isResolved || !match.team2.isResolved;
  const ft = match.prediction?.ft ?? [null, null];
  const pens = match.prediction?.pens ?? [null, null];
  const showPen =
    ft[0] !== null && ft[1] !== null && ft[0] === ft[1];

  const updateScore = (side: "team1" | "team2", raw: string) => {
    const parsed = parseScoreInput(raw);
    const nextFt: [number | null, number | null] =
      side === "team1" ? [parsed, ft[1]] : [ft[0], parsed];

    if (nextFt[0] === null || nextFt[1] === null) {
      onChange(match.matchNumber, null);
      return;
    }

    const next: PredictionScore = { ft: [nextFt[0], nextFt[1]] };
    if (nextFt[0] === nextFt[1] && pens[0] !== null && pens[1] !== null) {
      next.pens = [pens[0], pens[1]];
    }
    onChange(match.matchNumber, next);
  };

  const updatePen = (side: "team1" | "team2", raw: string) => {
    if (ft[0] === null || ft[1] === null || ft[0] !== ft[1]) return;
    const parsed = parseScoreInput(raw);
    const nextPens: [number | null, number | null] =
      side === "team1" ? [parsed, pens[1]] : [pens[0], parsed];
    if (nextPens[0] === null || nextPens[1] === null) {
      onChange(match.matchNumber, { ft: [ft[0], ft[1]] });
      return;
    }
    onChange(match.matchNumber, {
      ft: [ft[0], ft[1]],
      pens: [nextPens[0], nextPens[1]],
    });
  };

  return (
    <article
      className={`wc26-prediction-match${match.winnerSide ? " has-winner" : ""}${
        disabled ? " is-disabled" : ""
      }`}
    >
      <PredictionTeamRow
        participant={match.team1}
        scoreValue={ft[0] === null ? "" : String(ft[0])}
        penValue={pens[0] === null ? "" : String(pens[0])}
        showPen={showPen}
        side="team1"
        winnerSide={match.winnerSide}
        disabled={disabled}
        onScoreChange={(value) => updateScore("team1", value)}
        onPenChange={(value) => updatePen("team1", value)}
      />
      <PredictionTeamRow
        participant={match.team2}
        scoreValue={ft[1] === null ? "" : String(ft[1])}
        penValue={pens[1] === null ? "" : String(pens[1])}
        showPen={showPen}
        side="team2"
        winnerSide={match.winnerSide}
        disabled={disabled}
        onScoreChange={(value) => updateScore("team2", value)}
        onPenChange={(value) => updatePen("team2", value)}
      />
    </article>
  );
}

function PodiumPlace({
  place,
  label,
  participant,
}: {
  place: 1 | 2 | 3;
  label: string;
  participant: BracketParticipant | null;
}) {
  return (
    <div className={`wc26-podium-place wc26-podium-place--${place}`}>
      <div className="wc26-podium-medal">{place}</div>
      <div className="wc26-podium-body">
        <div className="wc26-podium-label">{label}</div>
        {participant ? (
          <div className="wc26-podium-team">
            <TeamFlag
              fifaCode={participant.fifaCode}
              teamName={participant.name}
              variant="badge"
              className="wc26-prediction-flag"
            />
            <span>{participant.name}</span>
          </div>
        ) : (
          <div className="wc26-podium-empty">Predict knockout results</div>
        )}
      </div>
    </div>
  );
}

export function WorldCup2026PredictionBracket({
  matches,
  teams,
}: {
  matches: Match[];
  teams: Team[];
}) {
  const [predictions, setPredictions] = useState<Record<number, PredictionScore>>(() => {
    const stored = loadStoredPredictions();
    if (Object.keys(stored).length > 0) return stored;
    return seedPredictionsFromMatches(matches);
  });

  useEffect(() => {
    saveStoredPredictions(predictions);
  }, [predictions]);

  const bracket = useMemo(
    () => buildPredictionBracket(matches, teams, predictions),
    [matches, teams, predictions]
  );

  const handlePredictionChange = (matchNumber: number, score: PredictionScore | null) => {
    setPredictions((current) => {
      const next = { ...current };
      if (!score) {
        delete next[matchNumber];
        return prunePredictionsAfterChange(next, matchNumber);
      }

      next[matchNumber] = score;
      if (determineWinnerSide(score)) {
        return prunePredictionsAfterChange(next, matchNumber);
      }
      return next;
    });
  };

  const clearPredictions = () => {
    localStorage.removeItem(KNOCKOUT_PREDICTIONS_KEY);
    setPredictions({});
  };

  const mainRoundKeys = new Set(["r32", "r16", "qf", "sf", "final"]);

  return (
    <section className="wc26-prediction-bracket" aria-label="Knockout predictions">
      <div className="wc26-chart-toolbar">
        <p className="wc26-prediction-subtitle">
          Enter scores to fill the bracket. Winners advance automatically.
        </p>
        <button type="button" className="btn btn-secondary wc26-prediction-clear" onClick={clearPredictions}>
          Clear all
        </button>
      </div>

      <div className="wc26-podium" aria-label="Predicted podium">
        <PodiumPlace place={1} label="Champions" participant={bracket.podium.first} />
        <PodiumPlace place={2} label="Runners-up" participant={bracket.podium.second} />
        <PodiumPlace place={3} label="Third place" participant={bracket.podium.third} />
      </div>

      <div className="wc26-prediction-scroll">
        <div className="wc26-prediction-tree">
          {bracket.rounds
            .filter((round) => mainRoundKeys.has(round.key))
            .map((round) => (
              <div key={round.key} className="wc26-prediction-round">
                <h4 className="wc26-prediction-round-title">{round.label}</h4>
                <div className="wc26-prediction-round-grid">
                  {round.matches.map((match) => (
                    <div
                      key={match.matchNumber}
                      className="wc26-prediction-match-wrap"
                      style={
                        {
                          "--grid-row": getMatchGridRow(match.matchNumber),
                          "--grid-span": getMatchGridSpan(match.matchNumber),
                        } as CSSProperties
                      }
                    >
                      <PredictionMatchCard match={match} onChange={handlePredictionChange} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {bracket.thirdPlaceMatch ? (
        <div className="wc26-prediction-third-place">
          <h4 className="wc26-prediction-round-title">Third place playoff</h4>
          <PredictionMatchCard
            match={bracket.thirdPlaceMatch}
            onChange={handlePredictionChange}
          />
        </div>
      ) : null}
    </section>
  );
}

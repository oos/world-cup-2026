import { MapPin } from "lucide-react";

export function MatchCardMeta({
  dateMeta,
  venueLabel,
  kickoffTime,
}: {
  dateMeta?: string | null;
  venueLabel?: string | null;
  kickoffTime?: string | null;
}) {
  if (!dateMeta && !venueLabel && !kickoffTime) {
    return null;
  }

  return (
    <div className="match-meta">
      {dateMeta ? <span className="match-meta-date">{dateMeta}</span> : null}
      {venueLabel || kickoffTime ? (
        <div className="match-meta-location">
          <MapPin
            className="match-meta-location-icon"
            aria-hidden="true"
            size={12}
            strokeWidth={2.25}
          />
          {venueLabel ? (
            <span className="match-meta-location-text">{venueLabel}</span>
          ) : null}
          {venueLabel && kickoffTime ? (
            <span className="match-meta-at" aria-hidden="true">
              {" @ "}
            </span>
          ) : null}
          {kickoffTime ? (
            <span className="match-meta-kickoff">{kickoffTime}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

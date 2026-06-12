import { useEffect, useState } from "react";
import { fetchClubBadgeUrl, getCachedClubBadgeUrl } from "../utils/clubBadge";

type ClubBadgeProps = {
  clubName?: string | null;
  badgeUrl?: string | null;
  className?: string;
};

export function ClubBadge({ clubName, badgeUrl, className = "" }: ClubBadgeProps) {
  const [fetchedSrc, setFetchedSrc] = useState<string | null>(() =>
    badgeUrl?.trim() ? badgeUrl : getCachedClubBadgeUrl(clubName)
  );

  useEffect(() => {
    if (badgeUrl?.trim()) {
      setFetchedSrc(badgeUrl);
      return;
    }

    if (!clubName?.trim()) {
      setFetchedSrc(null);
      return;
    }

    const cached = getCachedClubBadgeUrl(clubName);
    if (cached) {
      setFetchedSrc(cached);
      return;
    }

    let cancelled = false;
    fetchClubBadgeUrl(clubName).then((url) => {
      if (!cancelled) setFetchedSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [clubName, badgeUrl]);

  const baseClass = "club-badge";
  const fallbackClass = "club-badge--fallback";

  if (!fetchedSrc) {
    return (
      <div
        className={`${baseClass} ${fallbackClass} ${className}`.trim()}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={fetchedSrc}
      alt=""
      aria-hidden="true"
      className={`${baseClass} ${className}`.trim()}
      loading="lazy"
      decoding="async"
      onError={() => setFetchedSrc(null)}
    />
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Player } from "../api/client";
import { FilterLink, FilterSection } from "../components/FilterPanel";
import { PageHeaderActions } from "../components/PageHeader";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { TeamFlag } from "../components/TeamFlag";
import { usePageFilters } from "../context/FilterPanelContext";

export function PlayerDetail() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getPlayer(Number(id))
      .then(setPlayer)
      .catch((e) => setError(e.message));
  }, [id]);

  const filterContent = useMemo(
    () =>
      player ? (
        <>
          <FilterSection title="Browse">
            <FilterLink label="All Teams" to="/teams" />
            <FilterLink label="All Matches" to="/matches" />
          </FilterSection>
          {player.position && (
            <FilterSection title="Position">
              <span className="filter-option active" style={{ cursor: "default" }}>
                {player.position}
              </span>
            </FilterSection>
          )}
        </>
      ) : null,
    [player]
  );

  usePageFilters({
    title: "Player",
    content: filterContent,
    activeCount: 0,
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (!player) return <div className="loading">Loading player…</div>;

  return (
    <>
      <Link to="/teams" className="back-link">
        ← Back
      </Link>
      <div className="page-header-row page-header-row--end">
        <PageHeaderActions />
      </div>
      <div className="player-detail-card">
        <PlayerAvatar player={player} size="lg" className="photo" />
        <h2>{player.name}</h2>
        <p className="page-subtitle player-detail-team">
          <TeamFlag
            fifaCode={player.team_fifa_code}
            teamName={player.team_name}
            variant="badge"
            className="player-detail-flag"
          />
          <span>
            {player.team_name}
            {player.jersey_number ? ` · #${player.jersey_number}` : ""}
          </span>
        </p>
        <div className="bio-grid">
          <div className="bio-item">
            <div className="label">Position</div>
            <div className="value">{player.position || "—"}</div>
          </div>
          <div className="bio-item">
            <div className="label">Club</div>
            <div className="value">{player.club || "—"}</div>
          </div>
          <div className="bio-item">
            <div className="label">Date of Birth</div>
            <div className="value">{player.dob || "—"}</div>
          </div>
          <div className="bio-item">
            <div className="label">Height</div>
            <div className="value">
              {player.height_cm ? `${player.height_cm} cm` : "—"}
            </div>
          </div>
          <div className="bio-item">
            <div className="label">Nationality</div>
            <div className="value">{player.nationality || "—"}</div>
          </div>
        </div>
      </div>
      <AdBanner />
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Player, type PlayerCareer, type PlayerHonours } from "../api/client";
import { FilterLink, FilterSection } from "../components/FilterPanel";
import { PageHeaderActions } from "../components/PageHeader";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { PlayerCareerSection } from "../components/PlayerCareerSection";
import { PlayerHonoursSection } from "../components/PlayerHonoursSection";
import { SaveItemButton } from "../components/SaveItemButton";
import { TeamNameWithFlag } from "../components/TeamNameWithFlag";
import { usePageFilters } from "../context/FilterPanelContext";
import { useBackPath } from "../hooks/useNavigation";
import { getClubDisplayLabelWithCareer, hasClubName } from "../utils/playerClub";

export function PlayerDetail() {
  const { id } = useParams<{ id: string }>();
  const returnTo = useBackPath("/players");
  const [player, setPlayer] = useState<Player | null>(null);
  const [career, setCareer] = useState<PlayerCareer | null>(null);
  const [honours, setHonours] = useState<PlayerHonours | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const playerId = Number(id);
    Promise.all([
      api.getPlayer(playerId),
      api.getPlayerCareer(playerId),
      api.getPlayerHonours(playerId),
    ])
      .then(([playerData, careerData, honoursData]) => {
        setPlayer(playerData);
        setCareer(careerData);
        setHonours(honoursData);
      })
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

  const clubLabel = getClubDisplayLabelWithCareer(player, career);
  const showClubBadge = hasClubName(player, career);

  return (
    <>
      <Link to={returnTo} className="back-link">
        ← Back
      </Link>
      <div className="page-header-row page-header-row--end">
        <SaveItemButton
          itemType="player"
          itemId={player.id}
          snapshot={{
            name: player.name,
            teamName: player.team_name,
            teamFifaCode: player.team_fifa_code,
            position: player.position,
          }}
        />
        <PageHeaderActions />
      </div>
      <div className="player-detail-card">
        <PlayerAvatar size="lg" className="photo" />
        <h2>{player.name}</h2>
        <p className="page-subtitle player-detail-team">
          <TeamNameWithFlag
            name={player.team_name ?? "Unknown"}
            fifaCode={player.team_fifa_code}
            flagClassName="player-detail-flag"
          />
          {player.jersey_number ? (
            <span className="player-detail-jersey"> · #{player.jersey_number}</span>
          ) : null}
        </p>
        <div className="bio-grid">
          <div className="bio-item">
            <div className="label">Position</div>
            <div className="value">{player.position || "—"}</div>
          </div>
          <div className="bio-item">
            <div className="label">Club</div>
            <div className={`value${showClubBadge ? "" : " value--status"}`}>
              {clubLabel}
            </div>
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
      <section className="player-detail-section" aria-label="Honours">
        <h2 className="player-detail-section-title">Honours</h2>
        {honours ? (
          <PlayerHonoursSection honours={honours} />
        ) : (
          <p className="player-honours-empty">Loading honours…</p>
        )}
      </section>
      {career ? (
        <PlayerCareerSection
          clubHistory={career.club_history}
          internationalHistory={career.international_history}
        />
      ) : null}
      <AdBanner />
    </>
  );
}

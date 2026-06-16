import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { WorldRankingEntry } from "../api/client";
import { useReturnToLink } from "../hooks/useNavigation";
import { matchGroupAccentColor, matchGroupColors } from "../utils/matchGroupAccent";
import { TeamFlag } from "./TeamFlag";
import { TeamCardName } from "./TeamCardName";
import { TeamNameWithFlag } from "./TeamNameWithFlag";

function groupLabelStyle(group: string | null | undefined): CSSProperties | undefined {
  const colors = matchGroupColors(group);
  if (!colors) return undefined;
  return {
    backgroundColor: colors.bg,
    color: colors.text,
  };
}

function groupAccentStyle(group: string | null | undefined): CSSProperties | undefined {
  const accent = matchGroupAccentColor(group);
  if (!accent) return undefined;
  return { "--world-ranking-group-accent": accent } as CSSProperties;
}

function rankingRowMeta(entry: WorldRankingEntry): string | null {
  if (entry.qualified) {
    return entry.group || null;
  }
  return "Did not qualify";
}

export function WorldRankingRow({ entry }: { entry: WorldRankingEntry }) {
  const teamHref = useReturnToLink(
    entry.team_id != null ? `/teams/${entry.team_id}?year=2026` : "/world-rankings"
  );
  const qualifiedClass = entry.qualified ? "" : " world-ranking-entry--unqualified";
  const meta = rankingRowMeta(entry);
  const groupMetaClass = entry.qualified && entry.group ? " world-ranking-row-meta--group" : "";
  const content = (
    <>
      <TeamNameWithFlag
        name={entry.name}
        fifaCode={entry.fifa_code}
        flagIso={entry.flag_iso}
        worldRanking={entry.rank}
        inlineWorldRanking
        variant="badge"
        flagClassName="team-row-flag world-ranking-row-flag"
        nameClassName="team-row-name"
        className="team-row-name-wrap"
      />
      {meta ? (
        <div
          className={`world-ranking-row-meta${groupMetaClass}`}
          style={entry.qualified ? groupLabelStyle(entry.group) : undefined}
        >
          {meta}
        </div>
      ) : null}
    </>
  );

  if (entry.qualified && entry.team_id != null) {
    return (
      <Link to={teamHref} className={`team-row world-ranking-entry${qualifiedClass}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`team-row team-row--static world-ranking-entry${qualifiedClass}`}>
      {content}
    </div>
  );
}

export function WorldRankingCard({ entry }: { entry: WorldRankingEntry }) {
  const teamHref = useReturnToLink(
    entry.team_id != null ? `/teams/${entry.team_id}?year=2026` : "/world-rankings"
  );
  const qualifiedClass = entry.qualified ? "" : " world-ranking-entry--unqualified";
  const meta = entry.qualified ? entry.group : "Did not qualify";
  const groupAccentClass =
    entry.qualified && entry.group ? " world-ranking-card--group-accent" : "";
  const groupMetaClass = entry.qualified && entry.group ? " world-ranking-card-meta--group" : "";
  const cardAccentStyle = entry.qualified ? groupAccentStyle(entry.group) : undefined;
  const cardMetaStyle = entry.qualified ? groupLabelStyle(entry.group) : undefined;

  if (entry.qualified && entry.team_id != null) {
    return (
      <Link
        to={teamHref}
        className={`team-card-wrap world-ranking-entry${qualifiedClass}${groupAccentClass}`}
        style={cardAccentStyle}
      >
        <div className="team-card">
          <TeamFlag
            fifaCode={entry.fifa_code}
            teamName={entry.name}
            flagIso={entry.flag_iso}
          />
        </div>
        <TeamCardName
          name={entry.name}
          fifaCode={entry.fifa_code}
          worldRanking={entry.rank}
        />
        <div className={`team-card-meta${groupMetaClass}`} style={cardMetaStyle}>
          {meta}
        </div>
      </Link>
    );
  }

  return (
    <div className={`team-card-wrap team-card-wrap--static world-ranking-entry${qualifiedClass}`}>
      <div className="team-card team-card-static">
        <TeamFlag
          fifaCode={entry.fifa_code}
          teamName={entry.name}
          flagIso={entry.flag_iso}
        />
      </div>
      <TeamCardName
        name={entry.name}
        fifaCode={entry.fifa_code}
        worldRanking={entry.rank}
      />
      <div className="team-card-meta">{meta}</div>
    </div>
  );
}

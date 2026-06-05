import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type SquadGroup } from "../api/client";
import { SquadList } from "../components/SquadList";
import { FilterLink, FilterOption, FilterSection } from "../components/FilterPanel";
import { PageHeaderActions } from "../components/PageHeader";
import { usePageFilters } from "../context/FilterPanelContext";

const POSITIONS: { key: keyof SquadGroup; label: string }[] = [
  { key: "GK", label: "Goalkeepers" },
  { key: "DEF", label: "Defenders" },
  { key: "MID", label: "Midfielders" },
  { key: "FWD", label: "Forwards" },
  { key: "OTHER", label: "Other" },
];

export function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const [positionFilter, setPositionFilter] = useState<keyof SquadGroup | null>(null);
  const [team, setTeam] = useState<{
    name: string;
    flag_icon: string;
    group: string;
    confederation: string;
    squad: SquadGroup;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getTeam(Number(id))
      .then(setTeam)
      .catch((e) => setError(e.message));
  }, [id]);

  const availablePositions = useMemo(
    () => POSITIONS.filter(({ key }) => team?.squad[key]?.length),
    [team]
  );

  const filterContent = useMemo(
    () =>
      team ? (
        <>
          <FilterSection title="Position">
            <FilterOption
              label="All positions"
              active={!positionFilter}
              onClick={() => setPositionFilter(null)}
            />
            {availablePositions.map(({ key, label }) => (
              <FilterOption
                key={key}
                label={label}
                active={positionFilter === key}
                onClick={() => setPositionFilter(key)}
              />
            ))}
          </FilterSection>
          <FilterSection title="Related">
            <FilterLink
              label={`Teams in ${team.group}`}
              to={`/teams?group=${encodeURIComponent(team.group)}`}
            />
          </FilterSection>
        </>
      ) : null,
    [team, positionFilter, availablePositions]
  );

  usePageFilters({
    title: "Squad Filters",
    content: filterContent,
    activeCount: positionFilter ? 1 : 0,
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (!team) return <div className="loading">Loading squad…</div>;

  return (
    <>
      <Link to="/teams" className="back-link">
        ← Teams
      </Link>
      <div className="page-header-row page-header-row--end">
        <PageHeaderActions />
      </div>
      <div className="hero">
        <div style={{ fontSize: "3rem" }}>{team.flag_icon}</div>
        <h1>{team.name}</h1>
        <p>
          {team.group} · {team.confederation}
        </p>
      </div>
      <SquadList squad={team.squad} positionFilter={positionFilter} />
    </>
  );
}

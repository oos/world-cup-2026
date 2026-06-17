import { useEffect, useMemo, useState } from "react";
import posthog from "posthog-js";
import { Link, useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Team } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { TeamFlag } from "../components/TeamFlag";
import { WorldCup2026PlannerPanel } from "../components/WorldCup2026PlannerPanel";
import { useReturnToLink } from "../hooks/useNavigation";
import {
  SCHEDULE_TABLE_VIEW,
  SCHEDULE_VIEW_PARAM,
} from "../utils/worldCup2026Planner";
import { usePageMeta } from "../hooks/usePageMeta";

type GroupsView = "list" | "table";

function GroupTeamRow({ team }: { team: Team }) {
  const href = useReturnToLink(`/teams/${team.id}?year=2026`);

  return (
    <Link to={href} className="groups-team-row">
      <TeamFlag fifaCode={team.fifa_code} teamName={team.name} className="groups-team-flag" />
      <span className="groups-team-name">{team.name}</span>
      <span className="groups-team-meta">{team.player_count} players</span>
    </Link>
  );
}

function groupTeamsByGroup(teams: Team[]): { group: string; teams: Team[] }[] {
  const grouped = new Map<string, Team[]>();
  for (const team of teams) {
    const key = team.group || "Other";
    const existing = grouped.get(key) ?? [];
    existing.push(team);
    grouped.set(key, existing);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, groupTeams]) => ({
      group,
      teams: groupTeams.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function Groups() {
  usePageMeta(
    "World Cup 2026 Groups",
    "All 12 groups and team assignments",
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groupsView: GroupsView =
    searchParams.get(SCHEDULE_VIEW_PARAM) === SCHEDULE_TABLE_VIEW ? "table" : "list";

  useEffect(() => {
    api
      .getTeams()
      .then((teamsRes) => setTeams(teamsRes.teams))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const groupedTeams = useMemo(() => groupTeamsByGroup(teams), [teams]);

  const updateView = (next: GroupsView) => {
    posthog.capture("groups_view_changed", { view: next });
    const params = new URLSearchParams(searchParams);
    if (next === "table") {
      params.set(SCHEDULE_VIEW_PARAM, SCHEDULE_TABLE_VIEW);
    } else {
      params.delete(SCHEDULE_VIEW_PARAM);
      params.delete("plannerDate");
      params.delete("plannerVenue");
    }
    setSearchParams(params);
  };

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading groups…</div>;

  return (
    <>
      <PageHeader
        title="World Cup 2026 groups"
        subtitle={`${groupedTeams.length} groups · ${teams.length} teams`}
        accent="var(--palette-teal)"
        showActions={false}
      >
        <SegmentedTabs
          ariaLabel="Groups views"
          tabs={[
            { id: "list", label: "List" },
            { id: "table", label: "Table" },
          ]}
          value={groupsView}
          onChange={updateView}
        />
      </PageHeader>

      {groupsView === "table" ? (
        <WorldCup2026PlannerPanel
          id="groups-planner"
          ariaLabel="Groups table"
          matches={[]}
          teams={teams}
          variant="groups"
        />
      ) : (
        <>
          <div className="groups-grid">
            {groupedTeams.map(({ group, teams: groupTeams }) => (
              <section key={group} className="profile-card groups-card">
                <div className="groups-card-header">
                  <h2 className="groups-card-title">{group}</h2>
                  <Link to={`/schedule?group=${encodeURIComponent(group)}`} className="groups-card-link">
                    Fixtures →
                  </Link>
                </div>
                <div className="groups-team-list">
                  {groupTeams.map((team) => (
                    <GroupTeamRow key={team.id} team={team} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <AdBanner />
        </>
      )}
    </>
  );
}

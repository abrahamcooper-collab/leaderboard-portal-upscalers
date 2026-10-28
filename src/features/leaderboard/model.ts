/**
 * Turns flat leaderboard rows (one per agent, from the `leaderboard` SQL
 * function) into ranked teams. Pure, so it's shared by the server render and
 * unit tests.
 */

export type LeaderboardRow = {
  team_id: string;
  team_name: string;
  closer_name: string;
  agent_id: string | null;
  agent_name: string | null;
  agent_archived: boolean | null;
  target: number | null;
  sales_count: number;
  sales_total: number;
};

export type AgentStanding = {
  id: string;
  name: string;
  /** Removed from the team, but listed because they made sales this month. */
  archived: boolean;
  target: number | null;
  salesCount: number;
  salesTotal: number;
};

export type TeamStanding = {
  id: string;
  name: string;
  closerName: string;
  agents: AgentStanding[];
  target: number;
  salesCount: number;
  salesTotal: number;
};

/** Groups rows by team; teams and their agents are sorted by sales total, highest first. */
export function toTeamStandings(rows: readonly LeaderboardRow[]): TeamStanding[] {
  const teams = new Map<string, TeamStanding>();

  for (const row of rows) {
    let team = teams.get(row.team_id);
    if (!team) {
      team = {
        id: row.team_id,
        name: row.team_name,
        closerName: row.closer_name,
        agents: [],
        target: 0,
        salesCount: 0,
        salesTotal: 0,
      };
      teams.set(row.team_id, team);
    }

    // A team with no agents comes back as a single row with null agent fields.
    if (row.agent_id === null) continue;

    team.agents.push({
      id: row.agent_id,
      name: row.agent_name ?? "",
      archived: row.agent_archived ?? false,
      target: row.target,
      salesCount: row.sales_count,
      salesTotal: row.sales_total,
    });
    // A removed agent's sales still count for the team; their target no longer does.
    if (!row.agent_archived) team.target += row.target ?? 0;
    team.salesCount += row.sales_count;
    team.salesTotal += row.sales_total;
  }

  const standings = [...teams.values()];
  for (const team of standings) {
    team.agents.sort(bySalesThenName);
  }
  return standings.sort(bySalesThenName);
}

/** Share of target reached, capped at 100%; null when there's no target to measure against. */
export function targetProgress(salesTotal: number, target: number | null): number | null {
  if (!target) return null;
  return Math.min(salesTotal / target, 1);
}

function bySalesThenName(a: { salesTotal: number; name: string }, b: { salesTotal: number; name: string }) {
  return b.salesTotal - a.salesTotal || a.name.localeCompare(b.name);
}

import type { TeamStanding } from "@/features/leaderboard/model";
import type { AgentContact } from "@/features/teams/queries";
import type { AgentRowData } from "./agent-forms";

/** Joins agents' contact details with their month standings (target, sales). */
export function toAgentRows(
  agents: readonly AgentContact[],
  standing: TeamStanding | undefined,
): AgentRowData[] {
  const statsById = new Map(standing?.agents.map((agent) => [agent.id, agent]));
  return agents.map((agent) => {
    const stats = statsById.get(agent.id);
    return {
      ...agent,
      target: stats?.target ?? null,
      salesCount: stats?.salesCount ?? 0,
      salesTotal: stats?.salesTotal ?? 0,
    };
  });
}

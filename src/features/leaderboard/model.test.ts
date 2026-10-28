import { describe, expect, it } from "vitest";
import { targetProgress, toTeamStandings, type LeaderboardRow } from "./model";

const row = (overrides: Partial<LeaderboardRow>): LeaderboardRow => ({
  team_id: "t1",
  team_name: "Alpha",
  closer_name: "Sara",
  agent_id: "a1",
  agent_name: "Ali",
  agent_archived: false,
  target: 1000,
  sales_count: 0,
  sales_total: 0,
  ...overrides,
});

describe("toTeamStandings", () => {
  it("returns an empty list for no rows", () => {
    expect(toTeamStandings([])).toEqual([]);
  });

  it("sums agent sales and targets into team totals", () => {
    const [team] = toTeamStandings([
      row({ agent_id: "a1", sales_count: 2, sales_total: 3000, target: 5000 }),
      row({ agent_id: "a2", agent_name: "Bilal", sales_count: 1, sales_total: 500, target: null }),
    ]);
    expect(team).toMatchObject({ salesCount: 3, salesTotal: 3500, target: 5000 });
    expect(team.agents.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("counts a removed agent's sales but not their target", () => {
    const [team] = toTeamStandings([
      row({ agent_id: "a1", sales_total: 1000, target: 5000 }),
      row({ agent_id: "a2", agent_archived: true, sales_count: 1, sales_total: 700, target: 2000 }),
    ]);
    expect(team).toMatchObject({ salesTotal: 1700, salesCount: 1, target: 5000 });
    expect(team.agents.find((a) => a.id === "a2")?.archived).toBe(true);
  });

  it("keeps teams without agents, with zero totals", () => {
    const [team] = toTeamStandings([
      row({ agent_id: null, agent_name: null, agent_archived: null, target: null }),
    ]);
    expect(team).toMatchObject({ id: "t1", agents: [], salesTotal: 0, target: 0 });
  });

  it("ranks teams and agents by sales total, ties by name", () => {
    const standings = toTeamStandings([
      row({ team_id: "t1", team_name: "Alpha", agent_id: "a1", sales_total: 100 }),
      row({ team_id: "t2", team_name: "Bravo", agent_id: "b1", agent_name: "Zed", sales_total: 900 }),
      row({ team_id: "t2", team_name: "Bravo", agent_id: "b2", agent_name: "Amy", sales_total: 900 }),
    ]);
    expect(standings.map((t) => t.id)).toEqual(["t2", "t1"]);
    expect(standings[0].agents.map((a) => a.name)).toEqual(["Amy", "Zed"]);
  });
});

describe("targetProgress", () => {
  it("is null without a target", () => {
    expect(targetProgress(500, null)).toBeNull();
    expect(targetProgress(500, 0)).toBeNull();
  });

  it("caps at 100%", () => {
    expect(targetProgress(250, 1000)).toBe(0.25);
    expect(targetProgress(5000, 1000)).toBe(1);
  });
});

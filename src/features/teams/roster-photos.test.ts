import { describe, expect, it } from "vitest";
import { agentPhoto, closerPhoto } from "./roster-photos";

describe("closerPhoto", () => {
  it("matches the closer by team, with or without the Team prefix", () => {
    expect(closerPhoto("Team Daniel")).not.toBeNull();
    expect(closerPhoto("Team Daniel")).toBe(closerPhoto("daniel"));
    expect(closerPhoto("Team Mike")).not.toBe(closerPhoto("Team Daniel"));
  });

  it("is null for a team without photos", () => {
    expect(closerPhoto("Team Zed")).toBeNull();
  });
});

describe("agentPhoto", () => {
  it("matches the agent by team and name, ignoring case, spacing and punctuation", () => {
    expect(agentPhoto("Team Bill", "Joe Bell")).not.toBeNull();
    expect(agentPhoto("Team Bill", "  joe-BELL ")).toBe(agentPhoto("Team Bill", "Joe Bell"));
  });

  it("keeps same-named people in different teams apart", () => {
    expect(agentPhoto("Team Mike", "Kevin Williams")).not.toBeNull();
    expect(agentPhoto("Team Bill", "Kevin Williams")).toBeNull();
  });

  it("is null for an agent without a photo", () => {
    expect(agentPhoto("Team Bill", "Agent 69")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { closerPhoto, matchTeamPhotos } from "./roster-photos";

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

describe("matchTeamPhotos", () => {
  const photoOf = (team: string, agents: string[], agent: string) => matchTeamPhotos(team, agents).byAgent.get(agent) ?? null;

  it("matches exact names, ignoring case, spacing and punctuation", () => {
    const exact = photoOf("Team Bill", ["Joe Bell"], "Joe Bell");
    expect(exact).not.toBeNull();
    expect(photoOf("Team Bill", ["  joe-BELL "], "  joe-BELL ")).toBe(exact);
  });

  // The real roster as typed into the portal, against the photo file names.
  it("matches first-name-only photos and small spelling differences", () => {
    const bill = ["Joe Bell", "Peter Lane", "Henry Miller", "Johnson Nikeulei", "Sean Parker", "Kevin Wilson"];
    expect(matchTeamPhotos("Team Bill", bill).byAgent.size).toBe(6);
    expect(matchTeamPhotos("Team Bill", bill).unmatched).toEqual([]);
    expect(photoOf("Team Daniel", ["Alex Robert"], "Alex Robert")).toBe(photoOf("Team Daniel", ["Alex Roberts"], "Alex Roberts"));
    expect(photoOf("Team Mike", ["Ed Wilson"], "Ed Wilson")).toBe(photoOf("Team Mike", ["Ed Willson"], "Ed Willson"));
  });

  it("gives each photo to the closest name only", () => {
    // "Kevin Williams" is an exact match, so Team Mike's photo isn't spent on a near miss.
    const match = matchTeamPhotos("Team Mike", ["Kevin Williams", "Kevin Willson"]);
    expect(match.byAgent.get("Kevin Williams")).not.toBeUndefined();
    expect(match.byAgent.has("Kevin Willson")).toBe(false);
  });

  it("gives nobody a photo that two agents fit equally well", () => {
    const match = matchTeamPhotos("Team Bill", ["Henry Miller", "Henry Smith"]);
    expect(match.byAgent.size).toBe(0);
    expect(match.unmatched).toContain("Henry");
  });

  it("allows one typo per five letters, and no partial words", () => {
    expect(photoOf("Team Bill", ["Henri"], "Henri")).not.toBeNull(); // 1 edit in 5 letters
    expect(photoOf("Team Bill", ["Hen"], "Hen")).toBeNull(); // not a whole word of "Henry"
    expect(photoOf("Team Daniel", ["Paul Walker"], "Paul Walker")).toBeNull(); // a different surname
    expect(photoOf("Team Bill", ["Agent 69"], "Agent 69")).toBeNull();
  });

  it("keeps same-named people in different teams apart", () => {
    expect(photoOf("Team Bill", ["Kevin Williams"], "Kevin Williams")).toBeNull();
  });

  it("reports photos no agent matched", () => {
    expect(matchTeamPhotos("Team Daniel", ["Ruben Hill"]).unmatched).toEqual([
      "Richard Williams",
      "Alex Roberts",
      "Ethan Miller",
      "Paul Williams",
    ]);
  });
});

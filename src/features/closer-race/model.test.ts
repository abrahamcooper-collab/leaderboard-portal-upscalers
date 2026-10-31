import { describe, expect, it } from "vitest";
import type { TeamStanding } from "@/features/leaderboard/model";
import { RUN_AFTER_SALE_MS, coveredAt, moodFor, runEndsAt, strideMsAt, summarizeRace, toRaceRunners, trackProgress } from "./model";

const team = (id: string, name: string, salesTotal: number, target = 10_000): TeamStanding => ({
  id,
  name,
  color: "gray",
  closerName: name,
  closerAvatarPath: null,
  agents: [],
  target,
  salesCount: salesTotal > 0 ? 1 : 0,
  salesTotal,
});

describe("moodFor", () => {
  it("makes the leader happy, last sad and the middle neutral", () => {
    const totals = [3700, 2500, 1000];
    expect(totals.map((total) => moodFor(total, totals))).toEqual(["happy", "neutral", "sad"]);
  });

  it("is neutral for everyone when all are level", () => {
    expect(moodFor(0, [0, 0, 0])).toBe("neutral");
  });

  it("gives tied runners the same mood", () => {
    const totals = [500, 500, 100];
    expect(totals.map((total) => moodFor(total, totals))).toEqual(["happy", "happy", "sad"]);
  });
});

describe("toRaceRunners", () => {
  const standings = [team("m", "Mike", 3700), team("b", "Bill", 2500), team("d", "Team Daniel", 1000)];

  it("orders lanes by team order and ranks by sales", () => {
    const runners = toRaceRunners(standings);
    expect(runners.map((runner) => [runner.teamId, runner.rank])).toEqual([
      ["d", 3],
      ["b", 2],
      ["m", 1],
    ]);
  });

  it("caps progress at the finish line and handles a missing target", () => {
    const [over, none] = toRaceRunners([team("d", "Daniel", 15_000), team("b", "Bill", 500, 0)]);
    expect(over.progress).toBe(1);
    expect(none.progress).toBe(0);
  });
});

describe("summarizeRace", () => {
  it("totals targets and sales and names a clear leader", () => {
    const summary = summarizeRace(
      toRaceRunners([team("d", "Daniel", 1000), team("b", "Bill", 2500), team("m", "Mike", 10_000)]),
    );
    expect(summary).toEqual({
      teamTarget: 30_000,
      perCloserTarget: 10_000,
      teamSales: 13_500,
      leaderName: "Mike",
      finishedCount: 1,
    });
  });

  it("has no leader on a tie or before any sales, and no per-closer target when they differ", () => {
    const tied = summarizeRace(toRaceRunners([team("d", "Daniel", 500), team("b", "Bill", 500, 8000)]));
    expect(tied.leaderName).toBeNull();
    expect(tied.perCloserTarget).toBeNull();
    expect(summarizeRace(toRaceRunners([team("d", "Daniel", 0)])).leaderName).toBeNull();
  });
});

const saleAt = Date.parse("2026-10-31T12:00:00Z");
const sale = (offsetMs: number, amount: number) => ({ soldAt: new Date(saleAt + offsetMs).toISOString(), amount });

describe("coveredAt + trackProgress", () => {
  const at = (offsetMs: number, recentSales = [sale(0, 1000)], salesTotal = 3000) =>
    trackProgress(coveredAt({ salesTotal, recentSales, now: saleAt + offsetMs }), 10_000);

  it("covers the sale's dollars evenly, reaching the real total when the run ends", () => {
    const covered = (offsetMs: number) => coveredAt({ salesTotal: 3000, recentSales: [sale(0, 1000)], now: saleAt + offsetMs });
    expect(covered(0)).toBe(2000);
    expect(covered(RUN_AFTER_SALE_MS / 4)).toBe(2250);
    expect(covered(RUN_AFTER_SALE_MS)).toBe(3000);
  });

  it("starts where the runner was before the sale and arrives exactly when the run ends", () => {
    expect(at(0)).toBeCloseTo(0.2);
    expect(at(RUN_AFTER_SALE_MS / 2)).toBeCloseTo(0.25);
    expect(at(RUN_AFTER_SALE_MS)).toBeCloseTo(0.3);
    expect(at(RUN_AFTER_SALE_MS * 2)).toBeCloseTo(0.3);
  });

  it("adds overlapping sales, finishing when the newest one's run ends", () => {
    const sales = [sale(0, 1000), sale(RUN_AFTER_SALE_MS / 2, 2000)];
    expect(at(RUN_AFTER_SALE_MS / 2, sales)).toBeCloseTo(0.05);
    expect(at(RUN_AFTER_SALE_MS, sales)).toBeCloseTo(0.2);
    expect(at(RUN_AFTER_SALE_MS * 1.5, sales)).toBeCloseTo(0.3);
    expect(runEndsAt(sales)).toBe(saleAt + RUN_AFTER_SALE_MS * 1.5);
  });

  it("never goes below the start, past the real total, or past the finish line", () => {
    expect(at(0, [sale(0, 5000)], 3000)).toBe(0);
    expect(at(RUN_AFTER_SALE_MS, [sale(0, 1000)], 30_000)).toBe(1);
    expect(trackProgress(500, 0)).toBe(0);
  });

  it("has no run end without recent sales", () => {
    expect(runEndsAt([])).toBe(0);
  });
});

describe("strideMsAt", () => {
  it("is null when no run is in progress", () => {
    expect(strideMsAt(10_000, [], saleAt)).toBeNull();
    expect(strideMsAt(10_000, [sale(0, 1000)], saleAt + RUN_AFTER_SALE_MS + 1)).toBeNull();
  });

  it("strides faster for bigger sales, sprinting at half the track per run", () => {
    const small = strideMsAt(10_000, [sale(0, 200)], saleAt + 1000)!;
    const medium = strideMsAt(10_000, [sale(0, 1000)], saleAt + 1000)!;
    const big = strideMsAt(10_000, [sale(0, 5000)], saleAt + 1000)!;
    expect(small).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(big);
    expect(big).toBe(350);
    expect(strideMsAt(10_000, [sale(0, 50_000)], saleAt + 1000)).toBe(350);
  });

  it("speeds up while two sales overlap, then slows when the first finishes", () => {
    const sales = [sale(0, 1000), sale(RUN_AFTER_SALE_MS / 2, 1000)];
    const bothActive = strideMsAt(10_000, sales, saleAt + RUN_AFTER_SALE_MS * 0.75)!;
    const secondOnly = strideMsAt(10_000, sales, saleAt + RUN_AFTER_SALE_MS * 1.25)!;
    expect(bothActive).toBeLessThan(secondOnly);
  });
});

/**
 * The closer race: each closer's team sales as progress toward their team's
 * target, plus rank and mood. Pure, so it's shared by the page and tests.
 */
import type { TeamStanding } from "@/features/leaderboard/model";
import type { TeamColor } from "@/features/teams/team-colors";
import { sortByTeamOrder } from "@/features/teams/team-order";

export type Mood = "happy" | "neutral" | "sad";

/** How long a runner takes to cover the distance a sale adds (and keeps running). */
export const RUN_AFTER_SALE_MS = 10 * 60_000;

export type RecentSale = { soldAt: string; amount: number };

// Stride length of the run cycle: a slow jog for a small sale, a sprint for a big one.
const SLOWEST_STRIDE_MS = 900;
const FASTEST_STRIDE_MS = 350;
// Covering this share of the track in one run (e.g. half the target) is a full sprint.
const SPRINT_TRACK_SHARE = 0.5;

export type RaceRunner = {
  teamId: string;
  teamName: string;
  closerName: string;
  color: TeamColor;
  salesTotal: number;
  salesCount: number;
  target: number;
  /** 0–1: share of target reached, capped at the finish line. */
  progress: number;
  rank: number;
  mood: Mood;
  /** The closer's uploaded avatar (storage path), if any. */
  closerAvatarPath: string | null;
};

export type RaceSummary = {
  teamTarget: number;
  /** The shared per-closer target, or null when closers' targets differ. */
  perCloserTarget: number | null;
  teamSales: number;
  /** Null while nobody has sold anything, or when the lead is tied. */
  leaderName: string | null;
  finishedCount: number;
};

/** Runners in lane order (see team-order.ts). */
export function toRaceRunners(standings: readonly TeamStanding[]): RaceRunner[] {
  const totals = standings.map((team) => team.salesTotal);

  return sortByTeamOrder(standings, (team) => team.name).map((team) => {
    return {
      teamId: team.id,
      teamName: team.name,
      closerName: team.closerName,
      color: team.color,
      salesTotal: team.salesTotal,
      salesCount: team.salesCount,
      target: team.target,
      progress: team.target > 0 ? Math.min(team.salesTotal / team.target, 1) : 0,
      rank: 1 + totals.filter((total) => total > team.salesTotal).length,
      mood: moodFor(team.salesTotal, totals),
      closerAvatarPath: team.closerAvatarPath,
    };
  });
}

/**
 * Leader is happy, last place is sad, everyone between is neutral. Ties share
 * a mood; when everyone is level (including nobody having sold), all neutral.
 */
export function moodFor(total: number, allTotals: readonly number[]): Mood {
  const highest = Math.max(...allTotals);
  const lowest = Math.min(...allTotals);
  if (highest === lowest) return "neutral";
  if (total === highest) return "happy";
  if (total === lowest) return "sad";
  return "neutral";
}

export function summarizeRace(runners: readonly RaceRunner[]): RaceSummary {
  const targets = new Set(runners.map((runner) => runner.target));
  const [sharedTarget] = targets;
  const leaders = runners.filter((runner) => runner.rank === 1 && runner.salesTotal > 0);

  return {
    teamTarget: sum(runners.map((runner) => runner.target)),
    perCloserTarget: targets.size === 1 && sharedTarget > 0 ? sharedTarget : null,
    teamSales: sum(runners.map((runner) => runner.salesTotal)),
    leaderName: leaders.length === 1 ? leaders[0].closerName : null,
    finishedCount: runners.filter((runner) => runner.progress === 1).length,
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** When the runner stops: the end of the newest sale's run, or 0 with no recent sales. */
export function runEndsAt(recentSales: readonly RecentSale[]): number {
  if (recentSales.length === 0) return 0;
  return Math.max(...recentSales.map((sale) => Date.parse(sale.soldAt))) + RUN_AFTER_SALE_MS;
}

/**
 * Dollars the runner has covered at `now`. Each recent sale's amount is
 * covered evenly over RUN_AFTER_SALE_MS from when it was made, so the runner
 * reaches the real total exactly as its run ends. Overlapping sales add up:
 * the runner speeds up and keeps going until the newest one's run ends.
 */
export function coveredAt({
  salesTotal,
  recentSales,
  now,
}: {
  salesTotal: number;
  recentSales: readonly RecentSale[];
  now: number;
}): number {
  const stillToCover = sum(recentSales.map((sale) => sale.amount * (1 - runFraction(sale, now))));
  // Clamped so a sale from just before the month rolled over can't push the runner past its real total.
  return Math.min(Math.max(salesTotal - stillToCover, 0), salesTotal);
}

/** Where the runner is on the track (0–1): covered dollars against target, stopping at the finish line. */
export function trackProgress(covered: number, target: number): number {
  return target > 0 ? Math.min(covered / target, 1) : 0;
}

/**
 * Stride length at `now`, from how fast the runner is moving: the share of
 * the track its in-progress sales cover per run. Bigger or overlapping sales
 * mean quicker legs. Null once every sale's run has finished. (A sale
 * stamped a moment after `now` counts as in progress, so a runner whose clock
 * hasn't ticked since the sale arrived still runs.)
 */
export function strideMsAt(target: number, recentSales: readonly RecentSale[], now: number): number | null {
  const active = recentSales.filter((sale) => runFraction(sale, now) < 1);
  if (active.length === 0) return null;

  const trackShare = target > 0 ? sum(active.map((sale) => sale.amount)) / target : SPRINT_TRACK_SHARE;
  // Square root so small sales still look noticeably different from each other.
  const intensity = Math.sqrt(Math.min(trackShare / SPRINT_TRACK_SHARE, 1));
  return Math.round(SLOWEST_STRIDE_MS - (SLOWEST_STRIDE_MS - FASTEST_STRIDE_MS) * intensity);
}

/** How far through its run a sale is at `now`: 0 before it starts, 1 once done. */
function runFraction(sale: RecentSale, now: number): number {
  return Math.min(Math.max((now - Date.parse(sale.soldAt)) / RUN_AFTER_SALE_MS, 0), 1);
}

/**
 * The closer race: each closer's team sales as progress toward their team's
 * target, plus rank and mood. Pure, so it's shared by the page and tests.
 */
import type { TeamStanding } from "@/features/leaderboard/model";
import type { CloserFaces } from "@/features/teams/queries";
import type { TeamColor } from "@/features/teams/team-colors";
import { sortByTeamOrder } from "@/features/teams/team-order";

export type Mood = "happy" | "neutral" | "sad";

/** How long a runner takes to cover the distance a sale adds (and keeps running). */
export const RUN_AFTER_SALE_MS = 10 * 60_000;

export type RecentSale = { soldAt: string; amount: number };

export type RaceRunner = {
  teamId: string;
  closerName: string;
  color: TeamColor;
  salesTotal: number;
  salesCount: number;
  target: number;
  /** 0–1: share of target reached, capped at the finish line. */
  progress: number;
  rank: number;
  mood: Mood;
  /** Bitmoji for the current mood, falling back to the neutral one. */
  facePath: string | null;
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

const NO_FACES: CloserFaces = { neutral: null, happy: null, sad: null };

/** Runners in lane order (see team-order.ts). `facesByTeamId` supplies each closer's bitmojis. */
export function toRaceRunners(
  standings: readonly TeamStanding[],
  facesByTeamId: ReadonlyMap<string, CloserFaces>,
): RaceRunner[] {
  const totals = standings.map((team) => team.salesTotal);

  return sortByTeamOrder(standings, (team) => team.name).map((team) => {
    const mood = moodFor(team.salesTotal, totals);
    const faces = facesByTeamId.get(team.id) ?? NO_FACES;
    return {
      teamId: team.id,
      closerName: team.closerName,
      color: team.color,
      salesTotal: team.salesTotal,
      salesCount: team.salesCount,
      target: team.target,
      progress: team.target > 0 ? Math.min(team.salesTotal / team.target, 1) : 0,
      rank: 1 + totals.filter((total) => total > team.salesTotal).length,
      mood,
      facePath: faces[mood] ?? faces.neutral,
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
 * Where the runner is on the track (0–1) at `now`. Each recent sale's amount
 * is covered evenly over RUN_AFTER_SALE_MS from when it was made, so the
 * runner reaches its final spot exactly as its run ends. Overlapping sales
 * add up: the runner speeds up and keeps going until the newest one's run ends.
 */
export function trackProgressAt({
  salesTotal,
  target,
  recentSales,
  now,
}: {
  salesTotal: number;
  target: number;
  recentSales: readonly RecentSale[];
  now: number;
}): number {
  if (target <= 0) return 0;
  const stillToCover = sum(
    recentSales.map((sale) => {
      const elapsed = Math.min(Math.max((now - Date.parse(sale.soldAt)) / RUN_AFTER_SALE_MS, 0), 1);
      return sale.amount * (1 - elapsed);
    }),
  );
  // Clamped so a sale from just before the month rolled over can't push the runner past its real total.
  const covered = Math.min(Math.max(salesTotal - stillToCover, 0), salesTotal);
  return Math.min(covered / target, 1);
}

"use client";

import { useEffect, useState } from "react";
import { coveredAt, runEndsAt, strideMsAt, trackProgress, type RaceRunner, type RecentSale } from "./model";

/** How often a running runner's position is recalculated. */
export const MOTION_TICK_MS = 1_000;

export type RunnerMotion = {
  /** Dollars covered so far; reaches the real total when the run ends. */
  covered: number;
  /** 0–1 position on the track. */
  progress: number;
  /** Run-cycle length in ms, or null when standing still (no sales yet). */
  strideMs: number | null;
  /** True while a recent sale's distance is still being covered. */
  isCovering: boolean;
};

/**
 * A runner's live motion. While a recent sale's run is in progress the
 * position advances every tick, reaching the final spot exactly when the run
 * ends, and the stride quickens for bigger sales. Between sales the runner
 * keeps jogging in place (see `strideMsAt`).
 */
export function useRunnerMotion(
  runner: Pick<RaceRunner, "salesTotal" | "salesCount" | "target">,
  recentSales: readonly RecentSale[],
): RunnerMotion {
  const endsAt = runEndsAt(recentSales);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Date.now() >= endsAt) return;
    const interval = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (tick >= endsAt) clearInterval(interval);
    }, MOTION_TICK_MS);
    return () => clearInterval(interval);
  }, [endsAt]);

  const covered = coveredAt({ salesTotal: runner.salesTotal, recentSales, now });
  return {
    covered,
    progress: trackProgress(covered, runner.target),
    strideMs: strideMsAt(runner, recentSales, now),
    isCovering: now < endsAt,
  };
}

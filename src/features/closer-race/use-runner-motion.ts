"use client";

import { useEffect, useState } from "react";
import { runEndsAt, trackProgressAt, type RaceRunner, type RecentSale } from "./model";

/** How often a running runner's position is recalculated. */
export const MOTION_TICK_MS = 1_000;

/**
 * A runner's live track position and whether it's running. While a recent
 * sale's run is in progress the position advances every tick, reaching the
 * final spot exactly when the run (and the running animation) ends.
 */
export function useRunnerMotion(
  runner: Pick<RaceRunner, "salesTotal" | "target">,
  recentSales: readonly RecentSale[],
): { progress: number; isRunning: boolean } {
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

  return {
    progress: trackProgressAt({ salesTotal: runner.salesTotal, target: runner.target, recentSales, now }),
    isRunning: now < endsAt,
  };
}

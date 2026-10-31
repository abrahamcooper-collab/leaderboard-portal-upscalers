"use client";

import { useLiveSales } from "@/features/leaderboard/use-live-sales";
import { CloserRaceView } from "./closer-race-view";
import type { RaceRunner, RaceSummary, RecentSale } from "./model";

/**
 * The Operations Closeout page body, kept live: a new sale re-fetches the
 * standings, and that closer's runner runs up to their new spot over 10 minutes.
 */
export function LiveRace(props: {
  runners: readonly RaceRunner[];
  summary: RaceSummary;
  /** Sales from the last 10 minutes per team id; these drive the runners' motion. */
  recentSalesByTeam: Readonly<Record<string, readonly RecentSale[]>>;
  monthLabel: string;
}) {
  useLiveSales("closer-race");
  return <CloserRaceView {...props} />;
}

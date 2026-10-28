import "server-only";
import { currentMonth } from "@/lib/current-month";
import type { MonthStart } from "@/lib/month";
import { serverEnv } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";
import { toTeamStandings, type TeamStanding } from "./model";

/** Ranked teams with each agent's target and sales for the month (default: current). */
export async function getStandings(month: MonthStart = currentMonth()): Promise<TeamStanding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("leaderboard", {
    p_month: month,
    p_tz: serverEnv.APP_TIMEZONE,
  });
  if (error) throw new Error(`Loading leaderboard for ${month} failed: ${error.message}`);
  return toTeamStandings(data);
}

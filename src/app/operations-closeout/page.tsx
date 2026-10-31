import Link from "next/link";
import { RUN_AFTER_SALE_MS, toRaceRunners, summarizeRace } from "@/features/closer-race/model";
import { LiveRace } from "@/features/closer-race/live-race";
import { getStandings } from "@/features/leaderboard/queries";
import { getRecentSalesByTeam } from "@/features/sales/queries";
import { listTeams } from "@/features/teams/queries";
import { homePathFor, requireUser } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import { formatMonth } from "@/lib/month";

/** Operations Closeout: the closer race. Any signed-in user can open it. */
export default async function OperationsCloseoutPage() {
  const user = await requireUser();
  const month = currentMonth();
  const [standings, teams, recentSalesByTeam] = await Promise.all([
    getStandings(month),
    listTeams(),
    getRecentSalesByTeam(RUN_AFTER_SALE_MS),
  ]);

  const facesByTeamId = new Map(teams.map((team) => [team.id, team.closerFaces]));
  const runners = toRaceRunners(standings, facesByTeamId);

  return (
    <main className="relative min-h-dvh flex-1 bg-[#0b1120] bg-[radial-gradient(ellipse_at_top,#16233b_0%,#0b1120_60%)] px-[clamp(1rem,2.5vw,3rem)] py-[clamp(1rem,2.5vh,2.5rem)]">
      <Link href={homePathFor(user.role)} className="absolute left-4 top-3 text-xs text-slate-600 hover:text-slate-300">
        ← Portal
      </Link>
      <LiveRace runners={runners} summary={summarizeRace(runners)} recentSalesByTeam={recentSalesByTeam} monthLabel={formatMonth(month)} />
    </main>
  );
}

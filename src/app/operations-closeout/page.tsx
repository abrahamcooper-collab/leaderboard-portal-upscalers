import { BoardExitLink } from "@/components/board-exit-link";
import { RUN_AFTER_SALE_MS, toRaceRunners, summarizeRace } from "@/features/closer-race/model";
import { CloserRaceScreen } from "@/features/closer-race/closer-race-screen";
import { LiveRace } from "@/features/closer-race/live-race";
import { getStandings } from "@/features/leaderboard/queries";
import { getRecentSalesByTeam } from "@/features/sales/queries";
import { requireUser } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import { formatMonth } from "@/lib/month";

/** Operations Closeout: the closer race. Any signed-in user can open it. */
export default async function OperationsCloseoutPage() {
  const user = await requireUser();
  const month = currentMonth();
  const [standings, recentSalesByTeam] = await Promise.all([
    getStandings(month),
    getRecentSalesByTeam(RUN_AFTER_SALE_MS),
  ]);
  const runners = toRaceRunners(standings);

  return (
    <main className="flex flex-1 flex-col">
      <CloserRaceScreen>
        <BoardExitLink role={user.role} />
        <LiveRace runners={runners} summary={summarizeRace(runners)} recentSalesByTeam={recentSalesByTeam} monthLabel={formatMonth(month)} />
      </CloserRaceScreen>
    </main>
  );
}

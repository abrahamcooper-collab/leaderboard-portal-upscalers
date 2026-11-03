import { BoardExitLink } from "@/components/board-exit-link";
import { RUN_AFTER_SALE_MS, toRaceRunners, summarizeRace } from "@/features/closer-race/model";
import { CloserRaceScreen } from "@/features/closer-race/closer-race-screen";
import { CloserRaceView } from "@/features/closer-race/closer-race-view";
import { getStandings } from "@/features/leaderboard/queries";
import { getRecentSalesByTeam } from "@/features/sales/queries";
import { BOARD_LAYOUT_WIDTH, FitToScreen } from "@/features/slideshow/fit-to-screen";
import { requireUser } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import { formatMonth } from "@/lib/month";

/** Operations Closeout: the closer race. Any signed-in user can open it; the layout keeps it live. */
export default async function OperationsCloseoutPage() {
  const user = await requireUser();
  const month = currentMonth();
  const [standings, recentSalesByTeam] = await Promise.all([
    getStandings(month),
    getRecentSalesByTeam(RUN_AFTER_SALE_MS),
  ]);
  const runners = toRaceRunners(standings);

  return (
    // Fitted to the screen like the slideshow, so a TV shows the whole race edge to edge without scrolling.
    <main className="relative h-dvh">
      <FitToScreen mode="contain" minLayoutWidth={BOARD_LAYOUT_WIDTH} background="#0b1120">
        <CloserRaceScreen>
          <CloserRaceView runners={runners} summary={summarizeRace(runners)} recentSalesByTeam={recentSalesByTeam} monthLabel={formatMonth(month)} />
        </CloserRaceScreen>
      </FitToScreen>
      <BoardExitLink role={user.role} />
    </main>
  );
}

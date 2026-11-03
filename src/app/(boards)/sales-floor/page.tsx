import { BoardExitLink } from "@/components/board-exit-link";
import { getStandings } from "@/features/leaderboard/queries";
import { SalesFloorScreen } from "@/features/sales-floor/sales-floor-screen";
import { SalesFloorView } from "@/features/sales-floor/sales-floor-view";
import { BOARD_LAYOUT_WIDTH, FitToScreen } from "@/features/slideshow/fit-to-screen";
import { requireUser } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import { formatMonth } from "@/lib/month";

/** The Sales Floor TV board. Any signed-in user can open it; the layout keeps it live. */
export default async function SalesFloorPage() {
  const user = await requireUser();
  const month = currentMonth();
  const standings = await getStandings(month);

  return (
    // Fitted to the screen, so every TV shows the laptop layout edge to edge.
    <main className="relative h-dvh">
      <FitToScreen mode="fill" minLayoutWidth={BOARD_LAYOUT_WIDTH} background="#070707">
        <SalesFloorScreen>
          <SalesFloorView standings={standings} monthLabel={formatMonth(month)} />
        </SalesFloorScreen>
      </FitToScreen>
      <BoardExitLink role={user.role} />
    </main>
  );
}

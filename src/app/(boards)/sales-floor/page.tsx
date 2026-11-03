import { BoardExitLink } from "@/components/board-exit-link";
import { getStandings } from "@/features/leaderboard/queries";
import { SalesFloorScreen } from "@/features/sales-floor/sales-floor-screen";
import { SalesFloorView } from "@/features/sales-floor/sales-floor-view";
import { requireUser } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import { formatMonth } from "@/lib/month";

/** The Sales Floor TV board. Any signed-in user can open it; the layout keeps it live. */
export default async function SalesFloorPage() {
  const user = await requireUser();
  const month = currentMonth();
  const standings = await getStandings(month);

  return (
    <main className="flex flex-1 flex-col">
      <SalesFloorScreen>
        <BoardExitLink role={user.role} />
        <SalesFloorView standings={standings} monthLabel={formatMonth(month)} />
      </SalesFloorScreen>
    </main>
  );
}

import Link from "next/link";
import { getStandings } from "@/features/leaderboard/queries";
import { LiveBoard } from "@/features/leaderboard/live-board";
import { SalesFloorScreen } from "@/features/sales-floor/sales-floor-screen";
import { SalesFloorView } from "@/features/sales-floor/sales-floor-view";
import { listTeams } from "@/features/teams/queries";
import { homePathFor, requireUser } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import { formatMonth } from "@/lib/month";
import { videoPublicUrl } from "@/lib/supabase/storage";

/** The Sales Floor TV board. Any signed-in user can open it. */
export default async function SalesFloorPage() {
  const user = await requireUser();
  const month = currentMonth();
  const [standings, teams] = await Promise.all([getStandings(month), listTeams()]);
  const videoUrls = teams.flatMap((team) => (team.videoPath ? [videoPublicUrl(team.videoPath)] : []));

  return (
    <main className="flex flex-1 flex-col">
      <SalesFloorScreen>
        <Link
          href={homePathFor(user.role)}
          className="absolute left-4 top-3 text-xs text-zinc-600 hover:text-zinc-300"
        >
          ← Portal
        </Link>
        <LiveBoard videoUrls={videoUrls}>
          <SalesFloorView standings={standings} monthLabel={formatMonth(month)} />
        </LiveBoard>
      </SalesFloorScreen>
    </main>
  );
}

import Link from "next/link";
import { getStandings } from "@/features/leaderboard/queries";
import { LiveBoard } from "@/features/leaderboard/live-board";
import { salesFloorFontVariables } from "@/features/sales-floor/fonts";
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
    <main
      className={`${salesFloorFontVariables} relative flex min-h-dvh flex-1 flex-col md:h-dvh md:overflow-hidden bg-[#070707] bg-[radial-gradient(ellipse_at_top,#1d1d1f_0%,#070707_65%)] px-[clamp(1rem,2.5vw,3rem)] py-[clamp(1rem,2vw,2.5rem)]`}
    >
      <Link
        href={homePathFor(user.role)}
        className="absolute left-4 top-3 text-xs text-zinc-600 hover:text-zinc-300"
      >
        ← Portal
      </Link>
      <LiveBoard standings={standings} monthLabel={formatMonth(month)} videoUrls={videoUrls} />
    </main>
  );
}

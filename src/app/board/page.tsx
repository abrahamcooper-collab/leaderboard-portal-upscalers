import Link from "next/link";
import { getStandings } from "@/features/leaderboard/queries";
import { LiveBoard } from "@/features/leaderboard/live-board";
import { listTeams } from "@/features/teams/queries";
import { homePathFor, requireUser } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import { formatUsd } from "@/lib/money";
import { formatMonth } from "@/lib/month";
import { videoPublicUrl } from "@/lib/supabase/storage";

/** The TV leaderboard. Any signed-in user can open it. */
export default async function BoardPage() {
  const user = await requireUser();
  const month = currentMonth();
  const [standings, teams] = await Promise.all([getStandings(month), listTeams()]);
  const videoUrls = teams.flatMap((team) => (team.videoPath ? [videoPublicUrl(team.videoPath)] : []));
  const grandTotal = standings.reduce((sum, team) => sum + team.salesTotal, 0);

  return (
    <main className="min-h-full flex-1 bg-slate-950 px-6 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={homePathFor(user.role)} className="text-sm text-slate-500 hover:text-slate-300">
            ← Back to portal
          </Link>
          <h1 className="text-3xl font-black text-white">Leaderboard · {formatMonth(month)}</h1>
        </div>
        <p className="text-right">
          <span className="block text-sm uppercase tracking-wide text-slate-400">All teams</span>
          <span className="text-4xl font-black tabular-nums text-emerald-400">{formatUsd(grandTotal)}</span>
        </p>
      </header>
      <LiveBoard standings={standings} videoUrls={videoUrls} />
    </main>
  );
}

import { formatUsd } from "@/lib/money";
import { CloserCard } from "./closer-card";
import type { RaceRunner, RaceSummary, RecentSale } from "./model";
import { RaceTrack } from "./race-track";

/** The Operations Closeout body: headline stats, the race track and a card per closer. */
export function CloserRaceView({
  runners,
  summary,
  recentSalesByTeam,
  monthLabel,
}: {
  runners: readonly RaceRunner[];
  summary: RaceSummary;
  /** Sales from the last 10 minutes per team id; these drive the runners' motion. */
  recentSalesByTeam: Readonly<Record<string, readonly RecentSale[]>>;
  monthLabel: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-sky-400">
          Creative Giants · Operations Closeout · {monthLabel}
        </p>
        <h1 className="mt-2 text-[clamp(2.5rem,6vw,4.5rem)] font-black leading-none tracking-tight text-white">
          Closer <span className="text-amber-400">Race</span>
        </h1>
        <p className="mt-2 text-slate-400">
          {runners.length} {runners.length === 1 ? "closer" : "closers"}. One target. Every deal moves you closer to the crown.
        </p>
        <ul className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
          <Stat icon="🎯" label="Team target" value={formatUsd(summary.teamTarget)} />
          {summary.perCloserTarget !== null && (
            <Stat icon="🏁" label="Per closer" value={formatUsd(summary.perCloserTarget)} />
          )}
          <Stat icon="⚡" label="Current team sales" value={formatUsd(summary.teamSales)} />
          <Stat icon="👑" label="Leader" value={summary.leaderName ?? "—"} />
        </ul>
      </header>

      {runners.length === 0 ? (
        <p className="py-24 text-center text-slate-500">No closers yet.</p>
      ) : (
        <>
          <RaceTrack runners={runners} perCloserTarget={summary.perCloserTarget} recentSalesByTeam={recentSalesByTeam} />
          <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
            {runners.map((runner) => (
              <CloserCard key={runner.teamId} runner={runner} />
            ))}
          </div>
          <p className="text-sm text-slate-400">
            🏁 <span className="font-bold text-emerald-400">{summary.finishedCount}</span> of {runners.length}{" "}
            {runners.length === 1 ? "closer has" : "closers have"} reached their target.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <li className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-slate-300">
      <span aria-hidden>{icon}</span> <span className="uppercase">{label}</span>{" "}
      <span className="font-bold text-white">{value}</span>
    </li>
  );
}

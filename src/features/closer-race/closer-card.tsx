import type { CSSProperties } from "react";
import { TEAM_COLORS } from "@/features/teams/team-colors";
import { formatUsd } from "@/lib/money";
import type { RaceRunner } from "./model";
import { RunnerFace } from "./runner-face";

/** A closer's stats under the track: rank, sales, and progress to their target. */
export function CloserCard({ runner }: { runner: RaceRunner }) {
  const { accent } = TEAM_COLORS[runner.color];
  // Real share of target (can pass 100%); the bar and runner stop at the finish line.
  const percentOfTarget = runner.target > 0 ? Math.round((runner.salesTotal / runner.target) * 100) : 0;
  const barPercent = Math.round(runner.progress * 100);
  const isLeader = runner.rank === 1 && runner.salesTotal > 0;

  return (
    <article
      style={{ "--team-accent": accent } as CSSProperties}
      className="rounded-2xl border border-[var(--team-accent)]/70 bg-slate-900/70 p-4 shadow-[0_0_24px_-12px_var(--team-accent)]"
    >
      <header className="flex items-center gap-3 border-b border-slate-700/60 pb-3">
        <RunnerFace name={runner.closerName} path={runner.facePath} mood={runner.mood} size={44} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-[var(--team-accent)]">{runner.closerName}</h3>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Rank #{runner.rank}
            {isLeader && " · Leader"}
          </p>
        </div>
      </header>

      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-3xl font-extrabold tabular-nums text-white">{formatUsd(runner.salesTotal)}</p>
        <p className="text-lg font-extrabold tabular-nums text-[var(--team-accent)]">
          {runner.target > 0 ? `${percentOfTarget}%` : "No target"}
        </p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={barPercent}>
        <div
          className="h-full rounded-full bg-[var(--team-accent)] transition-[width] duration-[5s]"
          style={{ width: `${barPercent}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-400">
        {runner.salesCount} {runner.salesCount === 1 ? "sale" : "sales"}
        {runner.target > 0 && <> · target {formatUsd(runner.target)}</>}
      </p>
    </article>
  );
}

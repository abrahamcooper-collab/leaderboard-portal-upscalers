import type { CSSProperties } from "react";
import { TEAM_COLORS } from "@/features/teams/team-colors";
import { formatUsd } from "@/lib/money";
import type { RaceRunner, RecentSale } from "./model";
import { RunnerFigure } from "./runner-figure";
import { useRunnerMotion, MOTION_TICK_MS } from "./use-runner-motion";

const RUNNER_WIDTH_PX = 96;
const QUARTERS = [0, 0.25, 0.5, 0.75, 1];
// While running, each tick glides linearly into the next, so motion is continuous.
const RUNNING_TRANSITION = `left ${MOTION_TICK_MS}ms linear`;
// Any other jump (e.g. a deleted sale) settles quickly.
const SETTLE_TRANSITION = "left 1s ease-out";
const NO_RECENT_SALES: readonly RecentSale[] = [];

function axisLabel(fraction: number, perCloserTarget: number | null): string {
  const value = perCloserTarget === null ? `${fraction * 100}%` : formatUsd(fraction * perCloserTarget);
  if (fraction === 0) return `${value} · Start`;
  if (fraction === 1) return `${value} · Finish`;
  return value;
}

/**
 * The race: one lane per closer, progress measured against their own target.
 * Markers sit at runner-centre positions, so a runner on the 50% line is
 * exactly halfway.
 */
export function RaceTrack({
  runners,
  perCloserTarget,
  recentSalesByTeam,
}: {
  runners: readonly RaceRunner[];
  perCloserTarget: number | null;
  recentSalesByTeam: Readonly<Record<string, readonly RecentSale[]>>;
}) {
  // Runner centres travel from half a runner in from the start to half a runner short of the finish.
  const centreInset = { left: 24 + RUNNER_WIDTH_PX / 2, right: 48 + RUNNER_WIDTH_PX / 2 };

  return (
    <section className="rounded-3xl border border-slate-700/60 bg-slate-900/50 p-4 shadow-2xl">
      <div className="relative mb-2 h-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <div className="absolute inset-y-0" style={centreInset}>
          {QUARTERS.map((fraction) => (
            <span
              key={fraction}
              className={`absolute whitespace-nowrap ${fraction === 1 ? "text-emerald-400" : ""}`}
              style={{ left: `${fraction * 100}%`, transform: `translateX(-${fraction * 100}%)` }}
            >
              {axisLabel(fraction, perCloserTarget)}
            </span>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[3rem] border border-slate-600/60 bg-[linear-gradient(180deg,#152033_0%,#0f1726_100%)]">
        {/* Quarter markers */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0" style={centreInset}>
          {QUARTERS.slice(1, -1).map((fraction) => (
            <span key={fraction} className="absolute inset-y-0 border-l border-dashed border-slate-500/40" style={{ left: `${fraction * 100}%` }} />
          ))}
        </div>
        {/* Start line and chequered finish */}
        <span aria-hidden className="absolute inset-y-0 left-6 w-0.5 bg-white/40" />
        <span
          aria-hidden
          className="absolute inset-y-0 right-8 w-4 bg-[conic-gradient(#fff_25%,#000_0_50%,#fff_0_75%,#000_0)] bg-[length:8px_8px] opacity-90"
        />

        {runners.map((runner, lane) => (
          <Lane
            key={runner.teamId}
            runner={runner}
            isLast={lane === runners.length - 1}
            recentSales={recentSalesByTeam[runner.teamId] ?? NO_RECENT_SALES}
          />
        ))}
      </div>
    </section>
  );
}

/** One closer's lane. Their runner runs only after their own team's sales, and arrives as it stops. */
function Lane({
  runner,
  isLast,
  recentSales,
}: {
  runner: RaceRunner;
  isLast: boolean;
  recentSales: readonly RecentSale[];
}) {
  const { progress, isRunning } = useRunnerMotion(runner, recentSales);
  const { accent, onAccent } = TEAM_COLORS[runner.color];
  const style = { "--team-accent": accent, "--team-on-accent": onAccent } as CSSProperties;

  return (
    <div style={style} className={`relative h-[11.5rem] ${isLast ? "" : "border-b border-slate-600/40"}`}>
      <div className="absolute inset-y-0 left-6 right-12">
        <div
          className="absolute bottom-1.5 flex flex-col items-center"
          // Position depends on the clock, so server and browser render it a moment apart.
          suppressHydrationWarning
          style={{
            width: RUNNER_WIDTH_PX,
            left: `calc(${progress} * (100% - ${RUNNER_WIDTH_PX}px))`,
            transition: isRunning ? RUNNING_TRANSITION : SETTLE_TRANSITION,
          }}
        >
          <span className="mb-1 rounded-lg border-2 border-[var(--team-accent)] bg-slate-950 px-2 py-0.5 text-sm font-extrabold tabular-nums text-white shadow-[0_0_14px_-2px_var(--team-accent)]">
            {formatUsd(runner.salesTotal)}
          </span>
          <RunnerFigure name={runner.closerName} facePath={runner.facePath} mood={runner.mood} isRunning={isRunning} />
          <span className="mt-1 rounded-md bg-[var(--team-accent)] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--team-on-accent)]">
            {runner.closerName.split(" ")[0]}
          </span>
        </div>
      </div>
    </div>
  );
}

import { formatUsd } from "@/lib/money";
import { targetProgress, type TeamStanding } from "./model";

/** Read-only leaderboard: one card per team, one row per agent. Built for a TV. */
export function LeaderboardView({ standings }: { standings: readonly TeamStanding[] }) {
  if (standings.length === 0) {
    return <p className="text-center text-lg text-slate-400">No teams yet.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
      {standings.map((team, index) => (
        <TeamCard key={team.id} team={team} rank={index + 1} />
      ))}
    </div>
  );
}

function TeamCard({ team, rank }: { team: TeamStanding; rank: number }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-white/10">
      <header className="flex items-start justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-lg font-bold text-indigo-300">
            {rank}
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">{team.name}</h2>
            <p className="text-sm text-slate-400">Closer: {team.closerName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-emerald-400">{formatUsd(team.salesTotal)}</p>
          <p className="text-sm text-slate-400">
            {team.salesCount} {team.salesCount === 1 ? "sale" : "sales"}
            {team.target > 0 && <> · target {formatUsd(team.target)}</>}
          </p>
        </div>
      </header>
      <ProgressBar value={targetProgress(team.salesTotal, team.target)} />

      {team.agents.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">No agents on this team yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-2 font-medium">Agent</th>
              <th className="px-3 py-2 text-right font-medium">Target</th>
              <th className="px-3 py-2 text-right font-medium">Sales</th>
              <th className="px-5 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {team.agents.map((agent) => {
              const progress = targetProgress(agent.salesTotal, agent.target);
              return (
                <tr key={agent.id} className={agent.archived ? "text-slate-500" : "text-slate-200"}>
                  <td className="px-5 py-2.5 font-medium">
                    {agent.name}
                    {agent.archived && <span className="ml-2 text-xs font-normal">(removed)</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">
                    {agent.target === null ? "—" : formatUsd(agent.target)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{agent.salesCount}</td>
                  <td
                    className={`px-5 py-2.5 text-right font-semibold tabular-nums ${progress === 1 ? "text-emerald-400" : ""}`}
                  >
                    {formatUsd(agent.salesTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ProgressBar({ value }: { value: number | null }) {
  if (value === null) return <div className="h-1 bg-white/5" />;
  return (
    <div className="h-1 bg-white/5" role="progressbar" aria-valuenow={Math.round(value * 100)}>
      <div className="h-full bg-emerald-400 transition-[width] duration-700" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

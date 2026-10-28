import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { getStandings } from "@/features/leaderboard/queries";
import { CreateCloserForm } from "@/features/teams/closer-forms";
import { listTeams } from "@/features/teams/queries";
import { requireAdmin } from "@/lib/auth";
import { formatUsd } from "@/lib/money";

export default async function AdminTeamsPage() {
  await requireAdmin();
  const [teams, standings] = await Promise.all([listTeams(), getStandings()]);
  const standingById = new Map(standings.map((team) => [team.id, team]));

  return (
    <>
      <PageHeader title="Teams" />
      <div className="flex flex-col gap-6">
        <Card>
          {teams.length === 0 ? (
            <p className="text-sm text-slate-500">No teams yet. Create a closer below to start one.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {teams.map((team) => {
                const standing = standingById.get(team.id);
                return (
                  <li key={team.id}>
                    <Link
                      href={`/admin/teams/${team.id}`}
                      className="-mx-2 flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-3 hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{team.name}</p>
                        <p className="text-sm text-slate-500">
                          {team.closerName}
                          {team.closerPhone && <> · {team.closerPhone}</>}
                        </p>
                      </div>
                      <p className="text-sm text-slate-500">
                        {standing?.agents.filter((agent) => !agent.archived).length ?? 0} agents · this month{" "}
                        <span className="font-medium text-slate-900">{formatUsd(standing?.salesTotal ?? 0)}</span>
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="New closer" description="Creates the closer's login and their team.">
          <CreateCloserForm />
        </Card>
      </div>
    </>
  );
}

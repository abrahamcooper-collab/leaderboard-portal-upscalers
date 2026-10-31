import { AppShell, BOARD_LINKS, type NavLink } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";
import { CloserAgentRow } from "@/features/agents/agent-forms";
import { toAgentRows } from "@/features/agents/agent-rows";
import { getStandings } from "@/features/leaderboard/queries";
import { getTeamIdForCloser, listAgentContacts } from "@/features/teams/queries";
import { requireCloser } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import { formatUsd } from "@/lib/money";
import { formatMonth } from "@/lib/month";

const CLOSER_LINKS: readonly NavLink[] = [
  { href: "/portal", label: "My team" },
  ...BOARD_LINKS,
];

export default async function CloserPortalPage() {
  const user = await requireCloser();
  const teamId = await getTeamIdForCloser(user.id);

  if (!teamId) {
    return (
      <AppShell user={user} links={CLOSER_LINKS}>
        <p className="text-slate-500">You don&apos;t have a team yet. Ask an admin to set one up.</p>
      </AppShell>
    );
  }

  const [agents, standings] = await Promise.all([listAgentContacts(teamId), getStandings()]);
  const rank = standings.findIndex((standing) => standing.id === teamId);
  const team = standings[rank];
  const rows = toAgentRows(agents, team);

  return (
    <AppShell user={user} links={CLOSER_LINKS}>
      <PageHeader title={team?.name ?? "My team"} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Rank" value={team ? `#${rank + 1} of ${standings.length}` : "—"} />
        <Stat label={`Sales · ${formatMonth(currentMonth())}`} value={formatUsd(team?.salesTotal ?? 0)} />
        <Stat label="Number of sales" value={String(team?.salesCount ?? 0)} />
        <Stat label="Team target" value={team?.target ? formatUsd(team.target) : "—"} />
      </div>
      <Card title="Agents" description="You can update agents' names and phone numbers. Targets are set by an admin.">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No agents yet. An admin adds agents to your team.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((agent) => (
              <CloserAgentRow key={agent.id} agent={agent} />
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

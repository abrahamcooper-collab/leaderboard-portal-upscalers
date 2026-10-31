import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, PageHeader } from "@/components/ui";
import { AddAgentForm, AdminAgentRow } from "@/features/agents/agent-forms";
import { toAgentRows } from "@/features/agents/agent-rows";
import { getStandings } from "@/features/leaderboard/queries";
import { CloserLoginForm, EditCloserForm, RemoveCloserForm } from "@/features/teams/closer-forms";
import { getTeamForAdmin, listAgentContacts } from "@/features/teams/queries";
import { matchTeamPhotos } from "@/features/teams/roster-photos";
import { VideoUploader } from "@/features/teams/video-uploader";
import { requireAdmin } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import { formatMonth } from "@/lib/month";
import { videoPublicUrl } from "@/lib/supabase/storage";

export default async function AdminTeamPage({ params }: PageProps<"/admin/teams/[teamId]">) {
  await requireAdmin();
  const { teamId } = await params;
  if (!z.uuid().safeParse(teamId).success) notFound();

  const [team, agents, standings] = await Promise.all([
    getTeamForAdmin(teamId),
    listAgentContacts(teamId),
    getStandings(),
  ]);
  if (!team) notFound();
  const rows = toAgentRows(agents, standings.find((standing) => standing.id === teamId));
  const photos = matchTeamPhotos(team.name, agents.map((agent) => agent.name));

  return (
    <>
      <PageHeader title={team.name}>
        <Link href="/admin/teams" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          ← All teams
        </Link>
      </PageHeader>
      <div className="flex flex-col gap-6">
        <Card title="Closer and team">
          <EditCloserForm team={team} />
        </Card>

        <Card
          title={`Agents · ${formatMonth(currentMonth())}`}
          description="A target carries over to later months until you change it."
        >
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No agents yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((agent) => (
                <AdminAgentRow key={agent.id} agent={agent} photo={photos.byAgent.get(agent.name)} />
              ))}
            </ul>
          )}
          {photos.unmatched.length > 0 && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Photos not matched to an agent: {photos.unmatched.join(", ")}. An agent gets a photo when their name is
              close to the name on it.
            </p>
          )}
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Add an agent</h3>
            <AddAgentForm teamId={team.id} />
          </div>
        </Card>

        <Card title="Celebration video" description="Plays full screen on the leaderboard when this team makes a sale. MP4 or WebM, up to 50 MB.">
          <VideoUploader teamId={team.id} videoUrl={team.videoPath ? videoPublicUrl(team.videoPath) : null} />
        </Card>

        <Card title="Closer login" description="Change the email and password the closer signs in with. Both work straight away.">
          <CloserLoginForm team={team} />
        </Card>

        <Card title="Remove closer" description="Disables their login and takes the team off the leaderboard. Sales are kept.">
          <RemoveCloserForm team={team} />
        </Card>
      </div>
    </>
  );
}

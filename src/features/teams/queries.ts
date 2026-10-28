import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type TeamSummary = {
  id: string;
  name: string;
  closerName: string;
  closerPhone: string | null;
  videoPath: string | null;
};

export type TeamDetail = TeamSummary & {
  closerId: string;
  closerEmail: string | null;
};

export type AgentContact = { id: string; name: string; phone: string | null };

const TEAM_COLUMNS =
  "id, name, closer_id, celebration_video_path, closer:profiles!teams_closer_id_fkey(full_name, phone)";

export async function listTeams(): Promise<TeamSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_COLUMNS)
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error(`Listing teams failed: ${error.message}`);
  return data.map((team) => ({
    id: team.id,
    name: team.name,
    closerName: team.closer.full_name,
    closerPhone: team.closer.phone,
    videoPath: team.celebration_video_path,
  }));
}

/** Active team with its closer's login email (admin-only: reads Auth with the secret key). */
export async function getTeamForAdmin(teamId: string): Promise<TeamDetail | null> {
  const supabase = await createClient();
  const { data: team, error } = await supabase
    .from("teams")
    .select(TEAM_COLUMNS)
    .eq("id", teamId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error(`Loading team ${teamId} failed: ${error.message}`);
  if (!team) return null;

  const { data: auth, error: authError } = await createAdminClient().auth.admin.getUserById(
    team.closer_id,
  );
  if (authError) console.error(`[teams] Loading login for closer ${team.closer_id}: ${authError.message}`);

  return {
    id: team.id,
    name: team.name,
    closerId: team.closer_id,
    closerName: team.closer.full_name,
    closerPhone: team.closer.phone,
    closerEmail: auth?.user?.email ?? null,
    videoPath: team.celebration_video_path,
  };
}

export async function getTeamIdForCloser(closerId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id")
    .eq("closer_id", closerId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error(`Loading team for closer ${closerId} failed: ${error.message}`);
  return data?.id ?? null;
}

export async function listAgentContacts(teamId: string): Promise<AgentContact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id, name, phone")
    .eq("team_id", teamId)
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error(`Listing agents for team ${teamId} failed: ${error.message}`);
  return data;
}

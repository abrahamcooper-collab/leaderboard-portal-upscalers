import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toTeamColor, type TeamColor } from "./team-colors";
import { createClient } from "@/lib/supabase/server";

export type TeamSummary = {
  id: string;
  name: string;
  closerName: string;
  closerPhone: string | null;
  /** The closer's uploaded photo in the avatars bucket; null shows their team photo. */
  closerAvatarPath: string | null;
  color: TeamColor;
  videoPath: string | null;
};

export type TeamDetail = TeamSummary & {
  closerId: string;
  closerEmail: string | null;
};

export type AgentContact = {
  id: string;
  name: string;
  phone: string | null;
  /** Their uploaded photo in the avatars bucket; null shows their team photo (or initials). */
  avatarPath: string | null;
};

/** What the boards need to celebrate a sale by this agent the instant it arrives. */
export type AgentWithTeamVideo = { id: string; agentName: string; teamName: string; videoPath: string | null };

const TEAM_COLUMNS =
  "id, name, color, closer_id, celebration_video_path, closer:profiles!teams_closer_id_fkey(full_name, phone, avatar_path)";

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
    closerAvatarPath: team.closer.avatar_path,
    color: toTeamColor(team.color),
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
    closerAvatarPath: team.closer.avatar_path,
    closerEmail: auth?.user?.email ?? null,
    color: toTeamColor(team.color),
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
    .select("id, name, phone, avatar_path")
    .eq("team_id", teamId)
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error(`Listing agents for team ${teamId} failed: ${error.message}`);
  return data.map(({ avatar_path, ...agent }) => ({ ...agent, avatarPath: avatar_path }));
}

/** Every active agent on an active team, with their team's name and celebration video. */
export async function listCelebrationAgents(): Promise<AgentWithTeamVideo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id, name, team:teams!inner(name, celebration_video_path, archived_at)")
    .is("archived_at", null)
    .is("team.archived_at", null);
  if (error) throw new Error(`Listing agents for celebrations failed: ${error.message}`);
  return data.map((agent) => ({
    id: agent.id,
    agentName: agent.name,
    teamName: agent.team.name,
    videoPath: agent.team.celebration_video_path,
  }));
}

/** Whether the agent is on this closer's team (read access only, so it works before any write is allowed). */
export async function isAgentOnClosersTeam(agentId: string, closerId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id, team:teams!inner(closer_id)")
    .eq("id", agentId)
    .eq("team.closer_id", closerId)
    .maybeSingle();
  if (error) throw new Error(`Checking agent ${agentId} for closer ${closerId} failed: ${error.message}`);
  return data !== null;
}

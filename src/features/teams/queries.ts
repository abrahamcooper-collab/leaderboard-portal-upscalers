import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toTeamColor, type TeamColor } from "./team-colors";
import { createClient } from "@/lib/supabase/server";

/** Storage paths of a closer's bitmoji in each mood (null = not uploaded). */
export type CloserFaces = {
  neutral: string | null;
  happy: string | null;
  sad: string | null;
};

export type TeamSummary = {
  id: string;
  name: string;
  closerName: string;
  closerPhone: string | null;
  closerFaces: CloserFaces;
  color: TeamColor;
  videoPath: string | null;
};

export type TeamDetail = TeamSummary & {
  closerId: string;
  closerEmail: string | null;
};

export type AgentContact = { id: string; name: string; phone: string | null };

const TEAM_COLUMNS =
  "id, name, color, closer_id, celebration_video_path, closer:profiles!teams_closer_id_fkey(full_name, phone, avatar_path, avatar_happy_path, avatar_sad_path)";

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
    closerFaces: toCloserFaces(team.closer),
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
    closerFaces: toCloserFaces(team.closer),
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
    .select("id, name, phone")
    .eq("team_id", teamId)
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error(`Listing agents for team ${teamId} failed: ${error.message}`);
  return data;
}

function toCloserFaces(closer: {
  avatar_path: string | null;
  avatar_happy_path: string | null;
  avatar_sad_path: string | null;
}): CloserFaces {
  return { neutral: closer.avatar_path, happy: closer.avatar_happy_path, sad: closer.avatar_sad_path };
}

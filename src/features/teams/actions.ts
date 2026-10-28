"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { failure, invalid, success, unexpected, type ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth";
import * as field from "@/lib/form-schemas";
import { revalidateApp } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { VIDEO_BUCKET } from "@/lib/supabase/storage";

const closerDetails = {
  fullName: field.name("Closer name"),
  phone: field.phone,
  teamName: field.name("Team name"),
};

const createCloserSchema = z.object({
  ...closerDetails,
  email: field.email,
  password: field.password,
});

/** Creates the closer's login, profile and team, then opens the new team. */
export async function createCloser(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = createCloserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email, password, fullName, phone, teamName } = parsed.data;

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) {
    if (authError.code === "email_exists") return failure("A login with this email already exists.");
    return unexpected("createCloser: auth user", authError);
  }

  const supabase = await createClient();
  const { data: teamId, error } = await supabase.rpc("create_closer", {
    p_user_id: created.user.id,
    p_full_name: fullName,
    p_phone: phone,
    p_team_name: teamName,
  });
  if (error) {
    // Don't leave a login behind that has no profile or team.
    await admin.auth.admin.deleteUser(created.user.id);
    return unexpected("createCloser: profile and team", error);
  }

  revalidateApp();
  redirect(`/admin/teams/${teamId}`);
}

const updateCloserSchema = z.object({ teamId: field.id, ...closerDetails });

export async function updateCloser(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = updateCloserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { teamId, fullName, phone, teamName } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_closer", {
    p_team_id: teamId,
    p_full_name: fullName,
    p_phone: phone,
    p_team_name: teamName,
  });
  if (error) return unexpected(`updateCloser ${teamId}`, error);

  revalidateApp();
  return success("Saved.");
}

const resetPasswordSchema = z.object({ teamId: field.id, password: field.password });

export async function resetCloserPassword(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const closerId = await findCloserId(parsed.data.teamId);
  if (!closerId) return failure("Team not found.");

  const { error } = await createAdminClient().auth.admin.updateUserById(closerId, {
    password: parsed.data.password,
  });
  if (error) return unexpected(`resetCloserPassword ${closerId}`, error);
  return success("Password updated. Share it with the closer.");
}

const teamIdSchema = z.object({ teamId: field.id });

// Supabase has no "disable forever"; a ban this long is the documented equivalent.
const PERMANENT_BAN = "876000h";

/**
 * Archives the team and its agents and blocks the closer's login. Nothing is
 * deleted, so all their sales stay on record.
 */
export async function removeCloser(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = teamIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: closerId, error } = await supabase.rpc("archive_team", {
    p_team_id: parsed.data.teamId,
  });
  if (error) return unexpected(`removeCloser ${parsed.data.teamId}`, error);

  const { error: banError } = await createAdminClient().auth.admin.updateUserById(closerId, {
    ban_duration: PERMANENT_BAN,
  });
  // The team is already off the board; report it so the admin knows the login still works.
  if (banError) {
    console.error(`[action] removeCloser ban ${closerId}: ${banError.message}`);
    return failure("Team removed, but the closer's login couldn't be disabled. Try again.");
  }

  revalidateApp();
  redirect("/admin/teams");
}

const setVideoSchema = z.object({ teamId: field.id, path: z.string().min(1) });

/**
 * Points a team at a video the browser has already uploaded to Storage, and
 * deletes the one it replaces. Called directly (not as a form action) because
 * the upload happens client-side — videos exceed Server Action body limits.
 */
export async function setTeamVideo(teamId: string, path: string): Promise<ActionState> {
  await requireAdmin();
  const parsed = setVideoSchema.safeParse({ teamId, path });
  if (!parsed.success) return invalid(parsed.error);
  if (!path.startsWith(`${teamId}/`)) return failure("Video was uploaded for a different team.");

  return replaceTeamVideo(teamId, path);
}

export async function removeTeamVideo(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = teamIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  return replaceTeamVideo(parsed.data.teamId, null);
}

async function replaceTeamVideo(teamId: string, newPath: string | null): Promise<ActionState> {
  const supabase = await createClient();
  const { data: team, error } = await supabase
    .from("teams")
    .select("celebration_video_path")
    .eq("id", teamId)
    .maybeSingle();
  if (error) return unexpected(`replaceTeamVideo read ${teamId}`, error);
  if (!team) return failure("Team not found.");

  const { error: updateError } = await supabase
    .from("teams")
    .update({ celebration_video_path: newPath })
    .eq("id", teamId);
  if (updateError) return unexpected(`replaceTeamVideo write ${teamId}`, updateError);

  const oldPath = team.celebration_video_path;
  if (oldPath && oldPath !== newPath) await removeVideoFile(oldPath);

  revalidateApp();
  return success(newPath ? "Video saved." : "Video removed.");
}

async function findCloserId(teamId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("closer_id")
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw new Error(`Loading closer for team ${teamId} failed: ${error.message}`);
  return data?.closer_id ?? null;
}

/** Best effort: an orphaned file only costs storage, so it mustn't fail the action. */
async function removeVideoFile(path: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(VIDEO_BUCKET).remove([path]);
  if (error) console.error(`[teams] Removing video ${path}: ${error.message}`);
}

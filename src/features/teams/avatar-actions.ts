"use server";

import { z } from "zod";
import { failure, invalid, success, unexpected, type ActionState } from "@/lib/action-state";
import { requireUser, type CurrentUser } from "@/lib/auth";
import * as field from "@/lib/form-schemas";
import { revalidateApp } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { AVATAR_BUCKET } from "@/lib/supabase/storage";
import { isAgentOnClosersTeam } from "./queries";

// The browser shrinks photos to a 512px JPEG first (see resize-photo.ts); this is far above that.
const MAX_PHOTO_BYTES = 1_000_000;
// Every upload gets a new path, so a file never changes and can be cached for a year.
const IMMUTABLE_CACHE_SECONDS = String(365 * 24 * 60 * 60);

const targetSchema = z.object({ kind: z.enum(["closer", "agent"]), id: field.id });
type AvatarTarget = z.infer<typeof targetSchema>;

/**
 * Sets the photo shown for a closer or an agent on the boards, replacing any
 * earlier upload. A closer may change their own photo and their agents';
 * an admin may change anyone's.
 */
export async function updateAvatar(formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = targetSchema.safeParse({ kind: formData.get("kind"), id: formData.get("id") });
  if (!parsed.success) return invalid(parsed.error);
  const target = parsed.data;
  if (!(await mayEditAvatar(user, target))) return failure("You can only change your own photo and your agents' photos.");

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return failure("Choose a photo.");
  if (photo.size > MAX_PHOTO_BYTES || !(await isJpeg(photo))) return failure("That photo couldn't be used. Try a JPG or PNG.");

  // The secret-key client writes here: permission was checked just above, per photo.
  const admin = createAdminClient();
  const path = `${target.kind}s/${target.id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, photo, { contentType: "image/jpeg", cacheControl: IMMUTABLE_CACHE_SECONDS, upsert: false });
  if (uploadError) return unexpected(`updateAvatar upload ${target.kind} ${target.id}`, uploadError);

  const replaced = await setAvatarPath(target, path);
  if (replaced.error) {
    await admin.storage.from(AVATAR_BUCKET).remove([path]);
    return unexpected(`updateAvatar save ${target.kind} ${target.id}`, replaced.error);
  }
  await removeOldPhoto(replaced.previousPath);

  revalidateApp();
  return success("Photo updated.");
}

/** Goes back to the team photo (or initials) for a closer or an agent. Same permissions as updateAvatar. */
export async function removeAvatar(formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = targetSchema.safeParse({ kind: formData.get("kind"), id: formData.get("id") });
  if (!parsed.success) return invalid(parsed.error);
  const target = parsed.data;
  if (!(await mayEditAvatar(user, target))) return failure("You can only change your own photo and your agents' photos.");

  const replaced = await setAvatarPath(target, null);
  if (replaced.error) return unexpected(`removeAvatar ${target.kind} ${target.id}`, replaced.error);
  await removeOldPhoto(replaced.previousPath);

  revalidateApp();
  return success("Photo removed.");
}

async function mayEditAvatar(user: CurrentUser, target: AvatarTarget): Promise<boolean> {
  if (user.role === "admin") return true;
  if (target.kind === "closer") return target.id === user.id;
  return isAgentOnClosersTeam(target.id, user.id);
}

/** Saves the new photo path and returns the one it replaced, so its file can be deleted. */
async function setAvatarPath(
  target: AvatarTarget,
  path: string | null,
): Promise<{ previousPath: string | null; error: { message: string } | null }> {
  const admin = createAdminClient();
  const table = target.kind === "closer" ? "profiles" : "agents";
  const { data: before, error: readError } = await admin.from(table).select("avatar_path").eq("id", target.id).maybeSingle();
  if (readError) return { previousPath: null, error: readError };
  if (!before) return { previousPath: null, error: { message: "not found" } };

  const { error } = await admin.from(table).update({ avatar_path: path }).eq("id", target.id);
  return { previousPath: before.avatar_path, error };
}

/** Best effort: an orphaned file only costs storage, so it mustn't fail the action. */
async function removeOldPhoto(path: string | null): Promise<void> {
  if (!path) return;
  const { error } = await createAdminClient().storage.from(AVATAR_BUCKET).remove([path]);
  if (error) console.error(`[avatars] Removing old photo ${path}: ${error.message}`);
}

/** JPEG files start with FF D8 FF; the browser always sends one (see resize-photo.ts). */
async function isJpeg(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}

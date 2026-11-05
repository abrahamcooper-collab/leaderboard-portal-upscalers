"use server";

import { z } from "zod";
import { failure, invalid, success, unexpected, type ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth";
import { revalidateApp } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { SOUNDTRACK_BUCKET, SOUNDTRACK_FOLDER } from "@/lib/supabase/storage";

// Only paths the uploader makes; anything else isn't one of ours.
const pathSchema = z.string().regex(new RegExp(`^${SOUNDTRACK_FOLDER}/[0-9a-f-]{36}\\.[a-z0-9]{2,5}$`), {
  message: "That upload wasn't recognised. Try again.",
});

/**
 * Makes a track the browser has already uploaded the TV pages' soundtrack,
 * and deletes the one it replaces. Called directly (not as a form action)
 * because the upload happens client-side: audio can exceed Server Action limits.
 */
export async function setSoundtrack(path: string): Promise<ActionState> {
  await requireAdmin();
  const parsed = pathSchema.safeParse(path);
  if (!parsed.success) return invalid(parsed.error);
  return replaceSoundtrack(parsed.data);
}

/** Turns the soundtrack off and deletes its file. */
export async function removeSoundtrack(): Promise<ActionState> {
  await requireAdmin();
  return replaceSoundtrack(null);
}

async function replaceSoundtrack(newPath: string | null): Promise<ActionState> {
  const supabase = await createClient();
  const { data: before, error: readError } = await supabase.from("app_settings").select("soundtrack_path").maybeSingle();
  if (readError) return unexpected("replaceSoundtrack read", readError);
  if (!before) return failure("The soundtrack isn't set up yet: run the soundtrack migration in Supabase first.");

  const { error } = await supabase
    .from("app_settings")
    .update({ soundtrack_path: newPath, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return unexpected("replaceSoundtrack write", error);

  // Best effort: an orphaned file only costs storage, so it mustn't fail the action.
  const oldPath = before.soundtrack_path;
  if (oldPath && oldPath !== newPath) {
    const { error: removeError } = await supabase.storage.from(SOUNDTRACK_BUCKET).remove([oldPath]);
    if (removeError) console.error(`[soundtrack] Removing ${oldPath}: ${removeError.message}`);
  }

  revalidateApp();
  return success(newPath ? "Soundtrack saved. It plays on the TV screens." : "Soundtrack removed.");
}

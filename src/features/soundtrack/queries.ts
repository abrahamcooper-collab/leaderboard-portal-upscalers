import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * The TV pages' background soundtrack (a path in the soundtracks bucket), or
 * null for none. Also null if it can't be read (e.g. the soundtrack migration
 * hasn't been run yet), so the boards keep working without one.
 */
export async function getSoundtrackPath(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("soundtrack_path").maybeSingle();
  if (error) {
    console.error(`[soundtrack] Reading the soundtrack setting failed: ${error.message}`);
    return null;
  }
  return data?.soundtrack_path ?? null;
}

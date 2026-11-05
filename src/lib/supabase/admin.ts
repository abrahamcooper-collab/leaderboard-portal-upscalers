import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import type { Database } from "./database.types";

/**
 * Client with the secret key — bypasses Row Level Security. Use only after
 * the server has checked the caller may do this exact thing: Auth admin
 * operations (creating/deleting logins, admins only) and photo uploads
 * (checked per photo in features/teams/avatar-actions.ts).
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

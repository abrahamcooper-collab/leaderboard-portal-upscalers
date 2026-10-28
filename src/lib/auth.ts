import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, UserRole } from "@/lib/supabase/database.types";

export type CurrentUser = {
  id: string;
  fullName: string;
  role: UserRole;
};

const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin/sales",
  closer: "/portal",
};

export function homePathFor(role: UserRole): string {
  return HOME_BY_ROLE[role];
}

/**
 * The signed-in user with their role, or null. Memoized per request, so
 * layouts, pages and actions can all call it without repeat lookups.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  return loadUser(supabase, userId);
});

/**
 * Looks up a login's profile. A login without one (e.g. created by hand in
 * the Supabase dashboard) has no portal access, so this returns null.
 */
export async function loadUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CurrentUser | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Loading profile ${userId} failed: ${error.message}`);
  if (!profile) return null;

  return { id: profile.id, fullName: profile.full_name, role: profile.role };
}

/** Redirects to /login unless someone is signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects anyone who isn't an admin to their own home page. */
export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("admin");
}

/** Redirects anyone who isn't a closer to their own home page. */
export async function requireCloser(): Promise<CurrentUser> {
  return requireRole("closer");
}

async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(homePathFor(user.role));
  return user;
}

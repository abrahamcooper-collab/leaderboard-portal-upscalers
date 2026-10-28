"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { failure, invalid, type ActionState } from "@/lib/action-state";
import { homePathFor, loadUser } from "@/lib/auth";
import { email } from "@/lib/form-schemas";
import { createClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email,
  password: z.string().min(1, { message: "Enter your password." }),
});

export async function signIn(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return failure("Incorrect email or password.");

  const user = await loadUser(supabase, data.user.id);
  if (!user) {
    await supabase.auth.signOut();
    return failure("This account doesn't have portal access. Ask an admin.");
  }
  redirect(homePathFor(user.role));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

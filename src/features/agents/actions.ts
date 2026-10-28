"use server";

import { z } from "zod";
import { failure, invalid, success, unexpected, type ActionState } from "@/lib/action-state";
import { requireAdmin, requireUser } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import * as field from "@/lib/form-schemas";
import { revalidateApp } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";

const contact = {
  name: field.name("Agent name"),
  phone: field.phone,
};

/** Blank means "leave the target as it is". */
const optionalTarget = z.preprocess(
  (value) => (value === "" ? undefined : value),
  field.dollars("Target", { allowZero: true }).optional(),
);

const createAgentSchema = z.object({ teamId: field.id, ...contact, target: optionalTarget });

export async function createAgent(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = createAgentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { teamId, name, phone, target } = parsed.data;

  const supabase = await createClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .insert({ team_id: teamId, name, phone })
    .select("id")
    .single();
  if (error) return unexpected(`createAgent team ${teamId}`, error);

  if (target !== undefined) {
    const targetError = await saveTarget(agent.id, target);
    if (targetError) return targetError;
  }

  revalidateApp();
  return success(`${name} added.`);
}

const adminUpdateSchema = z.object({ agentId: field.id, ...contact, target: optionalTarget });

/** Admin edit: contact details plus this month's target. */
export async function updateAgentAsAdmin(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = adminUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { agentId, name, phone, target } = parsed.data;

  const contactError = await saveContact(agentId, { name, phone });
  if (contactError) return contactError;
  if (target !== undefined) {
    const targetError = await saveTarget(agentId, target);
    if (targetError) return targetError;
  }

  revalidateApp();
  return success("Saved.");
}

const contactUpdateSchema = z.object({ agentId: field.id, ...contact });

/** Closer edit: name and phone only. RLS limits closers to their own team's agents. */
export async function updateAgentContact(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = contactUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { agentId, name, phone } = parsed.data;

  const contactError = await saveContact(agentId, { name, phone });
  if (contactError) return contactError;

  revalidateApp();
  return success("Saved.");
}

const removeAgentSchema = z.object({ agentId: field.id });

/**
 * Archives the agent: they leave the team and the sale picker, but their
 * sales stay on record and keep counting toward the team's totals.
 */
export async function removeAgent(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = removeAgentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("agents")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.agentId)
    .is("archived_at", null);
  if (error) return unexpected(`removeAgent ${parsed.data.agentId}`, error);

  revalidateApp();
  return success("Agent removed.");
}

async function saveContact(
  agentId: string,
  contactDetails: { name: string; phone: string | null },
): Promise<ActionState | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .update(contactDetails)
    .eq("id", agentId)
    .select("id");
  if (error) return unexpected(`saveContact ${agentId}`, error);
  // RLS filters out rows the user may not edit, so "no rows" means not allowed (or gone).
  if (data.length === 0) return failure("You can't edit this agent.");
  return null;
}

async function saveTarget(agentId: string, amount: number): Promise<ActionState | null> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("monthly_targets")
    .upsert({ agent_id: agentId, month: currentMonth(), amount });
  if (error) return unexpected(`saveTarget ${agentId}`, error);
  return null;
}

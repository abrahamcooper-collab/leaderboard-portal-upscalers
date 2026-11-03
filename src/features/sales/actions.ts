"use server";

import { z } from "zod";
import { CLOSER_WRITES_NOT_SET_UP, failure, invalid, isPermissionDenied, success, unexpected, type ActionState } from "@/lib/action-state";
import { isAgentOnClosersTeam } from "@/features/teams/queries";
import { requireAdmin, requireUser } from "@/lib/auth";
import * as field from "@/lib/form-schemas";
import { formatUsdExact } from "@/lib/money";
import { revalidateApp } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";

const recordSaleSchema = z.object({
  agentId: z.uuid({ message: "Choose the agent who made the sale." }),
  amount: field.dollars("Sale amount", { allowZero: false }),
});

/**
 * Records a sale, by an admin for any agent or by a closer for their own
 * team's active agents (RLS enforces which). The insert itself is what
 * triggers the board celebration (Realtime).
 */
export async function recordSale(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = recordSaleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { agentId, amount } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sales")
    .insert({ agent_id: agentId, amount, created_by: user.id });
  if (isPermissionDenied(error)) {
    // Refused for their own agent means the database isn't set up for closer sales, not that it's the wrong team.
    const ownAgent = user.role === "closer" && (await isAgentOnClosersTeam(agentId, user.id));
    return failure(ownAgent ? CLOSER_WRITES_NOT_SET_UP : "You can only record sales for agents on your own team.");
  }
  if (error) return unexpected(`recordSale agent ${agentId} by ${user.id}`, error);

  revalidateApp();
  return success(`${formatUsdExact(amount)} sale recorded.`);
}

const deleteSaleSchema = z.object({ saleId: field.id });

export async function deleteSale(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = deleteSaleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("sales").delete().eq("id", parsed.data.saleId);
  if (error) return unexpected(`deleteSale ${parsed.data.saleId}`, error);

  revalidateApp();
  return success("Sale deleted.");
}

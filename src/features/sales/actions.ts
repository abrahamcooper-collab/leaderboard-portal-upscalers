"use server";

import { z } from "zod";
import { invalid, success, unexpected, type ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth";
import * as field from "@/lib/form-schemas";
import { formatUsdExact } from "@/lib/money";
import { revalidateApp } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";

const recordSaleSchema = z.object({
  agentId: z.uuid({ message: "Choose the agent who made the sale." }),
  amount: field.dollars("Sale amount", { allowZero: false }),
});

/** Records a sale. The insert itself is what triggers the board celebration (Realtime). */
export async function recordSale(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = recordSaleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { agentId, amount } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sales")
    .insert({ agent_id: agentId, amount, created_by: admin.id });
  if (error) return unexpected(`recordSale agent ${agentId}`, error);

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

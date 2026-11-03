"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { videoPublicUrl } from "@/lib/supabase/storage";

/** A sale with everything its celebration shows. */
export type NewSale = {
  id: string;
  amount: number;
  /** When it was recorded (server time, ISO). */
  createdAt: string;
  agentName: string;
  teamName: string;
  videoUrl: string | null;
};

// A board celebrates a few at most after a gap, so a TV waking from sleep doesn't replay a backlog.
const MAX_NEW_SALES = 3;

const sinceSchema = z.iso.datetime({ offset: true });

/**
 * Sales recorded after `since`, oldest first, for the TV boards to celebrate.
 * Read on the server with the viewer's session, so it works even when the
 * browser's live connection isn't recognised as signed in.
 */
export async function listSalesSince(since: string): Promise<NewSale[]> {
  await requireUser();
  const parsed = sinceSchema.safeParse(since);
  if (!parsed.success) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("id, amount, created_at, agent:agents(name, team:teams(name, celebration_video_path))")
    .gt("created_at", parsed.data)
    .order("created_at")
    .limit(MAX_NEW_SALES);
  if (error) {
    console.error(`[board] Listing sales since ${parsed.data}: ${error.message}`);
    return [];
  }
  return data.map((sale) => ({
    id: sale.id,
    amount: sale.amount,
    createdAt: sale.created_at,
    agentName: sale.agent.name,
    teamName: sale.agent.team.name,
    videoUrl: sale.agent.team.celebration_video_path ? videoPublicUrl(sale.agent.team.celebration_video_path) : null,
  }));
}

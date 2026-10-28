import "server-only";
import { createClient } from "@/lib/supabase/server";

const RECENT_SALES_LIMIT = 100;

export type RecentSale = {
  id: string;
  amount: number;
  soldAt: string;
  agentName: string;
  teamName: string;
};

export type SaleAgentOption = { id: string; name: string };
export type SaleTeamOption = { id: string; name: string; agents: SaleAgentOption[] };

export async function listRecentSales(): Promise<RecentSale[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("id, amount, sold_at, agent:agents(name, team:teams(name))")
    .order("sold_at", { ascending: false })
    .limit(RECENT_SALES_LIMIT);
  if (error) throw new Error(`Listing recent sales failed: ${error.message}`);
  return data.map((sale) => ({
    id: sale.id,
    amount: sale.amount,
    soldAt: sale.sold_at,
    agentName: sale.agent.name,
    teamName: sale.agent.team.name,
  }));
}

/** Active teams with their active agents, for the "who made this sale" picker. */
export async function listSaleOptions(): Promise<SaleTeamOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, agents(id, name)")
    .is("archived_at", null)
    .is("agents.archived_at", null)
    .order("name")
    .order("name", { referencedTable: "agents" });
  if (error) throw new Error(`Listing sale options failed: ${error.message}`);
  return data.filter((team) => team.agents.length > 0);
}

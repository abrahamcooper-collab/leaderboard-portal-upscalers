import { ActionForm } from "@/components/action-form";
import { Field, Input, Select } from "@/components/ui";
import { formatUsdExact } from "@/lib/money";
import { deleteSale, recordSale } from "./actions";
import type { RecentSale, SaleTeamOption } from "./queries";

/** Pick the agent (grouped by team) and the amount; the team follows from the agent. */
export function RecordSaleForm({ teams }: { teams: readonly SaleTeamOption[] }) {
  if (teams.length === 0) {
    return <p className="text-sm text-slate-500">Add a closer and at least one agent before recording sales.</p>;
  }

  return (
    <ActionForm action={recordSale} submitLabel="Record sale" className="grid items-end gap-4 sm:grid-cols-[2fr_1fr_auto]">
      <Field label="Agent">
        <Select name="agentId" required defaultValue="">
          <option value="" disabled>
            Choose an agent…
          </option>
          {teams.map((team) => (
            <optgroup key={team.id} label={team.name}>
              {team.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Field label="Amount ($)">
        <Input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required />
      </Field>
    </ActionForm>
  );
}

/** `timeZone` is the app's time zone, so times don't show in the server's (UTC on Vercel). */
export function RecentSalesTable({ sales, timeZone }: { sales: readonly RecentSale[]; timeZone: string }) {
  if (sales.length === 0) return <p className="text-sm text-slate-500">No sales recorded yet.</p>;

  const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">When</th>
            <th className="px-3 py-2 font-medium">Agent</th>
            <th className="px-3 py-2 font-medium">Team</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="py-2 pl-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{dateTime.format(new Date(sale.soldAt))}</td>
              <td className="px-3 py-2 font-medium text-slate-900">{sale.agentName}</td>
              <td className="px-3 py-2 text-slate-600">{sale.teamName}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatUsdExact(sale.amount)}</td>
              <td className="py-2 pl-3 text-right">
                <ActionForm
                  action={deleteSale}
                  submitLabel="Delete"
                  variant="danger"
                  confirmMessage={`Delete the ${formatUsdExact(sale.amount)} sale by ${sale.agentName}?`}
                  className="flex justify-end"
                >
                  <input type="hidden" name="saleId" value={sale.id} />
                </ActionForm>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

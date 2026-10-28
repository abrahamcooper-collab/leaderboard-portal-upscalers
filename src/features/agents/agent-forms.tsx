import { ActionForm } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { formatUsd } from "@/lib/money";
import { createAgent, removeAgent, updateAgentAsAdmin, updateAgentContact } from "./actions";

export type AgentRowData = {
  id: string;
  name: string;
  phone: string | null;
  target: number | null;
  salesCount: number;
  salesTotal: number;
};

function ContactFields({ agent }: { agent?: { name: string; phone: string | null } }) {
  return (
    <>
      <Field label="Name">
        <Input name="name" defaultValue={agent?.name} required maxLength={80} />
      </Field>
      <Field label="Phone">
        <Input name="phone" type="tel" defaultValue={agent?.phone ?? ""} maxLength={30} />
      </Field>
    </>
  );
}

function TargetField({ target }: { target?: number | null }) {
  return (
    <Field label="Monthly target ($)">
      <Input
        name="target"
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        defaultValue={target ?? ""}
        placeholder="Not set"
      />
    </Field>
  );
}

function SalesSummary({ agent }: { agent: AgentRowData }) {
  return (
    <p className="text-sm text-slate-500">
      This month: <span className="font-medium text-slate-900">{formatUsd(agent.salesTotal)}</span> from{" "}
      {agent.salesCount} {agent.salesCount === 1 ? "sale" : "sales"}
      {agent.target !== null && <> · target {formatUsd(agent.target)}</>}
    </p>
  );
}

const ROW_FORM = "grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]";

/** Admin: edit name, phone and this month's target, or remove the agent. */
export function AdminAgentRow({ agent }: { agent: AgentRowData }) {
  return (
    <li className="flex flex-col gap-3 py-4">
      <SalesSummary agent={agent} />
      <ActionForm action={updateAgentAsAdmin} submitLabel="Save" variant="secondary" className={ROW_FORM}>
        <input type="hidden" name="agentId" value={agent.id} />
        <ContactFields agent={agent} />
        <TargetField target={agent.target} />
      </ActionForm>
      <ActionForm
        action={removeAgent}
        submitLabel="Remove agent"
        variant="danger"
        confirmMessage={`Remove ${agent.name} from the team? Their sales stay on record and still count toward the team's totals.`}
      >
        <input type="hidden" name="agentId" value={agent.id} />
      </ActionForm>
    </li>
  );
}

/** Closer: edit name and phone only. */
export function CloserAgentRow({ agent }: { agent: AgentRowData }) {
  return (
    <li className="flex flex-col gap-3 py-4">
      <SalesSummary agent={agent} />
      <ActionForm
        action={updateAgentContact}
        submitLabel="Save"
        variant="secondary"
        className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input type="hidden" name="agentId" value={agent.id} />
        <ContactFields agent={agent} />
      </ActionForm>
    </li>
  );
}

export function AddAgentForm({ teamId }: { teamId: string }) {
  return (
    <ActionForm action={createAgent} submitLabel="Add agent" className={ROW_FORM}>
      <input type="hidden" name="teamId" value={teamId} />
      <ContactFields />
      <TargetField />
    </ActionForm>
  );
}

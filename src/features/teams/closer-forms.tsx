import { ActionForm } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { createCloser, removeCloser, resetCloserPassword, updateCloser } from "./actions";
import type { TeamDetail } from "./queries";

function CloserFields({ team }: { team?: TeamDetail }) {
  return (
    <>
      <Field label="Closer name">
        <Input name="fullName" defaultValue={team?.closerName} required maxLength={80} />
      </Field>
      <Field label="Closer phone">
        <Input name="phone" type="tel" defaultValue={team?.closerPhone ?? ""} maxLength={30} />
      </Field>
      <Field label="Team name">
        <Input name="teamName" defaultValue={team?.name} required maxLength={80} />
      </Field>
    </>
  );
}

export function CreateCloserForm() {
  return (
    <ActionForm action={createCloser} submitLabel="Create closer" className="grid gap-4 sm:grid-cols-2">
      <CloserFields />
      <Field label="Login email">
        <Input name="email" type="email" required autoComplete="off" />
      </Field>
      <Field label="Password (min. 8 characters)">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
    </ActionForm>
  );
}

export function EditCloserForm({ team }: { team: TeamDetail }) {
  return (
    <ActionForm action={updateCloser} submitLabel="Save" className="grid gap-4 sm:grid-cols-3">
      <input type="hidden" name="teamId" value={team.id} />
      <CloserFields team={team} />
    </ActionForm>
  );
}

export function ResetPasswordForm({ teamId }: { teamId: string }) {
  return (
    <ActionForm action={resetCloserPassword} submitLabel="Set password" variant="secondary">
      <input type="hidden" name="teamId" value={teamId} />
      <Field label="New password">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
    </ActionForm>
  );
}

export function RemoveCloserForm({ team }: { team: TeamDetail }) {
  return (
    <ActionForm
      action={removeCloser}
      submitLabel="Remove closer and team"
      variant="danger"
      confirmMessage={`Remove ${team.closerName} and ${team.name}? Their login will be disabled and the team leaves the leaderboard. All sales stay on record.`}
    >
      <input type="hidden" name="teamId" value={team.id} />
    </ActionForm>
  );
}

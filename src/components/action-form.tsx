"use client";

import { useActionState, type ReactNode } from "react";
import { IDLE, type ActionState } from "@/lib/action-state";
import { Button } from "./ui";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Wraps a Server Action form: pending state, result message, and an optional
 * confirmation prompt. Keeps each form down to just its fields.
 */
export function ActionForm({
  action,
  submitLabel,
  variant = "primary",
  confirmMessage,
  className = "flex flex-col gap-4",
  children,
}: {
  action: FormAction;
  submitLabel: string;
  variant?: "primary" | "secondary" | "danger";
  confirmMessage?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [state, formAction, isPending] = useActionState(action, IDLE);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={variant} disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
        {state.status !== "idle" && (
          <p
            role="status"
            className={`text-sm ${state.status === "error" ? "text-red-600" : "text-emerald-600"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

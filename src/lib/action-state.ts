import type { z } from "zod";

/** What every form Server Action returns to `useActionState`. */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export const IDLE: ActionState = { status: "idle" };

export function success(message: string): ActionState {
  return { status: "success", message };
}

export function failure(message: string): ActionState {
  return { status: "error", message };
}

/** First validation message, phrased for the person filling the form. */
export function invalid(error: z.ZodError): ActionState {
  return failure(error.issues[0]?.message ?? "Please check the form and try again.");
}

/**
 * Logs a database/auth error with context and returns a safe message.
 * Internal details stay in the server logs.
 */
export function unexpected(context: string, error: { message: string }): ActionState {
  console.error(`[action] ${context}: ${error.message}`);
  return failure("Something went wrong. Please try again.");
}

/** Postgres "insufficient privilege": a row-level security policy refused the write. */
export function isPermissionDenied(error: { code?: string } | null): boolean {
  return error?.code === "42501";
}

/**
 * Shown when the database refuses a closer's write for their own agent: the
 * migration that allows closers to record sales and set targets hasn't been run.
 */
export const CLOSER_WRITES_NOT_SET_UP =
  "Closers can't save this yet: the database update that allows it hasn't been run. An admin needs to run supabase/migrations/20261103000000_closer_targets_and_sales.sql in the Supabase SQL Editor.";

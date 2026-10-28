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

import { z } from "zod";

/** Shared field rules so every form validates the same way. */

export const id = z.uuid({ message: "Invalid record. Refresh the page and try again." });

export const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { message: `${label} is required.` })
    .max(80, { message: `${label} must be 80 characters or fewer.` });

/** Optional; empty input becomes null. */
export const phone = z
  .string()
  .trim()
  .max(30, { message: "Phone number is too long." })
  .regex(/^[+\d\s().-]*$/, { message: "Phone number can only contain digits, spaces and + ( ) - ." })
  .transform((value) => value || null);

/** Dollar amount rounded to cents. */
export const dollars = (label: string, { allowZero }: { allowZero: boolean }) =>
  z.coerce
    .number({ message: `${label} must be a number.` })
    .refine((value) => (allowZero ? value >= 0 : value > 0), {
      message: allowZero ? `${label} can't be negative.` : `${label} must be more than $0.`,
    })
    .refine((value) => value <= 100_000_000, { message: `${label} is too large.` })
    .transform((value) => Math.round(value * 100) / 100);

export const email = z.email({ message: "Enter a valid email address." }).trim().toLowerCase();

export const password = z
  .string()
  .min(8, { message: "Password must be at least 8 characters." })
  .max(72, { message: "Password must be 72 characters or fewer." });

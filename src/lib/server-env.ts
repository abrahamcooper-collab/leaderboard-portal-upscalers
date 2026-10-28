import "server-only";
import { z } from "zod";

export const serverEnv = z
  .object({
    SUPABASE_SECRET_KEY: z.string().min(1),
    // Decides where month boundaries fall for targets and totals.
    APP_TIMEZONE: z
      .string()
      .default("UTC")
      .refine(isValidTimeZone, { message: "APP_TIMEZONE must be an IANA time zone" }),
  })
  .parse(process.env);

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

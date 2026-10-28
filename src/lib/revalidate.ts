import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Every page shows some slice of the same small dataset (teams, agents,
 * sales), so any write refreshes the whole app rather than tracking which
 * pages depend on which rows.
 */
export function revalidateApp(): void {
  revalidatePath("/", "layout");
}

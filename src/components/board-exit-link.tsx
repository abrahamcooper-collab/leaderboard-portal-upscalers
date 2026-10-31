import Link from "next/link";
import { homePathFor } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/database.types";

/** A way back to the portal from a full-screen picture or the slideshow; invisible until hovered, so it stays off the TV. */
export function BoardExitLink({ role }: { role: UserRole }) {
  return (
    <Link
      href={homePathFor(role)}
      className="absolute left-4 top-3 z-40 rounded-full bg-black/60 px-3 py-1 text-xs text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
    >
      ← Portal
    </Link>
  );
}

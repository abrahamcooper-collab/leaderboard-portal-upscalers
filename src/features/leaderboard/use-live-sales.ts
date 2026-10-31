"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";

export type SaleRow = Database["public"]["Tables"]["sales"]["Row"];

// Catches anything Realtime missed (e.g. the TV slept) and rolls the month over.
const FALLBACK_REFRESH_MS = 5 * 60_000;

/**
 * Keeps a server-rendered page live: any change to `sales` re-fetches the
 * page's data, and `onInsert` (optional) runs for each new sale.
 */
export function useLiveSales(
  channelName: string,
  onInsert?: (supabase: SupabaseClient<Database>, sale: SaleRow) => void,
): void {
  const router = useRouter();
  // A ref, so a new callback each render doesn't re-subscribe.
  const onInsertRef = useRef(onInsert);
  useEffect(() => {
    onInsertRef.current = onInsert;
  });

  useEffect(() => {
    const supabase = createClient();
    let hasSubscribed = false;

    const channel = supabase
      .channel(channelName)
      .on<SaleRow>("postgres_changes", { event: "*", schema: "public", table: "sales" }, (payload) => {
        router.refresh();
        if (payload.eventType === "INSERT") onInsertRef.current?.(supabase, payload.new);
      })
      .subscribe((status) => {
        // On re-subscribe after a dropped connection, catch up on missed sales.
        if (status !== "SUBSCRIBED") return;
        if (hasSubscribed) router.refresh();
        hasSubscribed = true;
      });

    const interval = setInterval(() => router.refresh(), FALLBACK_REFRESH_MS);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [channelName, router]);
}

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";

export type SaleRow = Database["public"]["Tables"]["sales"]["Row"];

// Catches anything Realtime missed (e.g. the TV slept) and rolls the month over.
const FALLBACK_REFRESH_MS = 5 * 60_000;

type LiveSalesHandlers = {
  /** Runs for each new sale Realtime delivers. */
  onInsert?: (supabase: SupabaseClient<Database>, sale: SaleRow) => void;
  /**
   * Runs whenever events may have been missed: after a dropped connection
   * reconnects, when a hidden tab becomes visible again (browsers throttle
   * background tabs, which can silently stall the connection), and on the
   * fallback refresh.
   */
  onResume?: (supabase: SupabaseClient<Database>) => void;
};

/** Keeps a server-rendered page live: any change to `sales` re-fetches the page's data. */
export function useLiveSales(channelName: string, handlers: LiveSalesHandlers = {}): void {
  const router = useRouter();
  // A ref, so new callbacks each render don't re-subscribe.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const supabase = createClient();
    let hasSubscribed = false;
    const resume = () => {
      router.refresh();
      handlersRef.current.onResume?.(supabase);
    };

    const channel = supabase
      .channel(channelName)
      .on<SaleRow>("postgres_changes", { event: "*", schema: "public", table: "sales" }, (payload) => {
        router.refresh();
        if (payload.eventType === "INSERT") handlersRef.current.onInsert?.(supabase, payload.new);
      })
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[live] ${channelName}: ${status}${error ? ` (${error.message})` : ""}; reconnecting.`);
        }
        if (status !== "SUBSCRIBED") return;
        if (hasSubscribed) resume();
        hasSubscribed = true;
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") resume();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(resume, FALLBACK_REFRESH_MS);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [channelName, router]);
}

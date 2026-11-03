"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";

export type SaleRow = Database["public"]["Tables"]["sales"]["Row"];

// Catches anything Realtime missed (e.g. the TV slept) and rolls the month over.
const FALLBACK_REFRESH_MS = 5 * 60_000;
// A new sale's data refresh waits this long, so re-rendering the page doesn't compete with its
// celebration video starting. The board is hidden behind the video meanwhile anyway.
const REFRESH_AFTER_SALE_MS = 3_000;

type LiveSalesHandlers = {
  /**
   * Runs for each new sale. `sale` is null when Realtime announced the insert
   * but withheld the row (it does that when it doesn't recognise the viewer as
   * signed in); the caller should then fetch it.
   */
  onInsert?: (sale: SaleRow | null) => void;
  /**
   * Runs whenever events may have been missed: after a dropped connection
   * reconnects, when a hidden tab becomes visible again (browsers throttle
   * background tabs, which can silently stall the connection), and on the
   * fallback refresh.
   */
  onResume?: () => void;
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
    let warnedWithheld = false;
    let pendingRefresh: ReturnType<typeof setTimeout> | undefined;
    const resume = () => {
      router.refresh();
      handlersRef.current.onResume?.();
    };

    const channel = supabase
      .channel(channelName)
      .on<SaleRow>("postgres_changes", { event: "*", schema: "public", table: "sales" }, (payload) => {
        if (payload.eventType !== "INSERT") {
          router.refresh();
          return;
        }
        const sale = typeof payload.new?.id === "string" ? payload.new : null;
        if (!sale && !warnedWithheld) {
          warnedWithheld = true;
          console.warn(`[live] ${channelName}: Realtime withheld the sale's details (${payload.errors?.join("; ") || "no reason given"}); fetching it instead.`);
        }
        handlersRef.current.onInsert?.(sale);
        clearTimeout(pendingRefresh);
        pendingRefresh = setTimeout(() => router.refresh(), REFRESH_AFTER_SALE_MS);
      });

    // Sign the live connection in as the viewer before joining, so Realtime applies their read
    // access; otherwise it can fall back to the public key and withhold sale details.
    let isCancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => (data.session ? supabase.realtime.setAuth(data.session.access_token) : undefined))
      .catch((error: unknown) => console.warn(`[live] ${channelName}: couldn't sign the live connection in.`, error))
      .finally(() => {
        if (isCancelled) return;
        channel.subscribe((status, error) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn(`[live] ${channelName}: ${status}${error ? ` (${error.message})` : ""}; reconnecting.`);
          }
          if (status !== "SUBSCRIBED") return;
          if (hasSubscribed) resume();
          hasSubscribed = true;
        });
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") resume();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(resume, FALLBACK_REFRESH_MS);
    return () => {
      isCancelled = true;
      clearTimeout(pendingRefresh);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [channelName, router]);
}

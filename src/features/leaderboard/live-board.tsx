"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { videoPublicUrl } from "@/lib/supabase/storage";
import { CelebrationOverlay, type Celebration } from "./celebration-overlay";
import { useLiveSales, type SaleRow } from "./use-live-sales";
import { usePreloadedVideos } from "./use-preloaded-videos";

// The TV controls fade out once the mouse has been still this long, so they don't sit on the board.
const CONTROLS_IDLE_MS = 4_000;
// Catching up after a dropped connection or a hidden tab: sales this recent still get their
// celebration, at most this many, so a TV waking from sleep doesn't replay a backlog.
const CATCH_UP_WINDOW_MS = 10 * 60_000;
const MAX_CATCH_UP = 3;

/**
 * Keeps the TV pages live (see the boards layout): every new sale queues a
 * full-screen celebration over whatever is showing and re-fetches the page's
 * data. Each sale is celebrated once, whether it arrives live or is caught up
 * after a gap. `videoUrls` are all teams' celebration videos, downloaded up
 * front so they play instantly.
 */
export function LiveBoard({
  videoUrls,
  children,
}: {
  videoUrls: readonly string[];
  children: ReactNode;
}) {
  const preloadedVideos = usePreloadedVideos(videoUrls);
  const [queue, setQueue] = useState<Celebration[]>([]);
  // Browsers only allow video with sound after someone interacts with the page.
  const [soundOn, setSoundOn] = useState(false);

  const celebratedSaleIds = useRef(new Set<string>());
  // Only sales after the board opened are celebrated; this moves forward as they arrive.
  // Set on mount, which runs before useLiveSales's effect below can ask to catch up.
  const lastSaleAt = useRef(0);
  useEffect(() => {
    lastSaleAt.current = Date.now();
  }, []);

  const celebrate = (supabase: SupabaseClient<Database>, sale: SaleRow) => {
    if (celebratedSaleIds.current.has(sale.id)) return;
    celebratedSaleIds.current.add(sale.id);
    lastSaleAt.current = Math.max(lastSaleAt.current, Date.parse(sale.created_at));
    loadCelebration(supabase, sale).then((celebration) => {
      if (celebration) setQueue((current) => [...current, celebration]);
    });
  };

  useLiveSales("live-board", {
    onInsert: celebrate,
    onResume: async (supabase) => {
      const since = Math.max(lastSaleAt.current, Date.now() - CATCH_UP_WINDOW_MS);
      for (const sale of await loadSalesSince(supabase, since)) celebrate(supabase, sale);
    },
  });

  const finishCurrent = useCallback(() => setQueue((current) => current.slice(1)), []);
  const current = queue[0];
  const showControls = useRecentActivity(CONTROLS_IDLE_MS);

  return (
    <>
      {children}
      {current && (
        <CelebrationOverlay
          key={current.key}
          celebration={current}
          videoSources={videoSourcesFor(current.videoUrl, preloadedVideos)}
          soundOn={soundOn}
          onDone={finishCurrent}
        />
      )}
      {/* Shown on any mouse or key activity; keyboard focus keeps them visible. */}
      <div
        className={`fixed bottom-4 right-4 z-40 flex gap-2 transition-opacity duration-500 focus-within:pointer-events-auto focus-within:opacity-100 ${
          showControls ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {!soundOn && (
          <BoardButton onClick={() => setSoundOn(true)}>Enable sound</BoardButton>
        )}
        <BoardButton onClick={() => void document.documentElement.requestFullscreen?.()}>
          Full screen
        </BoardButton>
      </div>
    </>
  );
}

/** True while there has been pointer or keyboard activity within the last `idleMs`. */
function useRecentActivity(idleMs: number): boolean {
  const [isActive, setIsActive] = useState(true);
  useEffect(() => {
    let timeout = setTimeout(() => setIsActive(false), idleMs);
    const wake = () => {
      setIsActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsActive(false), idleMs);
    };
    const events = ["pointermove", "pointerdown", "keydown"] as const;
    events.forEach((event) => window.addEventListener(event, wake, { passive: true }));
    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, wake));
    };
  }, [idleMs]);
  return isActive;
}

function BoardButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/15 hover:bg-black/70"
    >
      {children}
    </button>
  );
}

/** Where to play a team's video from, best first: the copy on this device, then streamed from Storage. */
function videoSourcesFor(videoUrl: string | null, preloaded: ReadonlyMap<string, string>): string[] {
  if (!videoUrl) return [];
  const local = preloaded.get(videoUrl);
  return local ? [local, videoUrl] : [videoUrl];
}

/** Sales recorded after `since` (ms), oldest first, so missed ones play in order. */
async function loadSalesSince(supabase: SupabaseClient<Database>, since: number): Promise<SaleRow[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .gt("created_at", new Date(since).toISOString())
    .order("created_at")
    .limit(MAX_CATCH_UP);
  if (error) {
    console.error(`[board] Catching up on sales since ${new Date(since).toISOString()}: ${error.message}`);
    return [];
  }
  return data;
}

async function loadCelebration(
  supabase: SupabaseClient<Database>,
  sale: SaleRow,
): Promise<Celebration | null> {
  const { data, error } = await supabase
    .from("agents")
    .select("name, team:teams(name, celebration_video_path)")
    .eq("id", sale.agent_id)
    .maybeSingle();
  if (error || !data) {
    console.error(`[board] Loading agent ${sale.agent_id} for sale ${sale.id}: ${error?.message ?? "not found"}`);
    return null;
  }

  const videoPath = data.team.celebration_video_path;
  return {
    key: sale.id,
    amount: sale.amount,
    agentName: data.name,
    teamName: data.team.name,
    videoUrl: videoPath ? videoPublicUrl(videoPath) : null,
  };
}

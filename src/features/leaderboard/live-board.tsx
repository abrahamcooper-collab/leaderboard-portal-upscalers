"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { videoPublicUrl } from "@/lib/supabase/storage";
import { CelebrationOverlay, type Celebration } from "./celebration-overlay";
import { useLiveSales, type SaleRow } from "./use-live-sales";
import { usePreloadedVideos } from "./use-preloaded-videos";

// The TV controls fade out once the mouse has been still this long, so they don't sit on the board.
const CONTROLS_IDLE_MS = 4_000;

/**
 * Keeps a TV board live (the Sales Floor, or the slideshow): every sale insert
 * queues a full-screen celebration and re-fetches the page's data from the
 * server. `videoUrls` are all teams' celebration videos, downloaded up front
 * so they play instantly.
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

  useLiveSales("live-board", (supabase, sale) => {
    loadCelebration(supabase, sale).then((celebration) => {
      if (celebration) setQueue((current) => [...current, celebration]);
    });
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
          videoSrc={current.videoUrl && (preloadedVideos.get(current.videoUrl) ?? current.videoUrl)}
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

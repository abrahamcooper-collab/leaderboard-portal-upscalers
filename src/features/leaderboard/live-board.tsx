"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import { videoPublicUrl } from "@/lib/supabase/storage";
import { CelebrationOverlay, type Celebration } from "./celebration-overlay";
import { LeaderboardView } from "./leaderboard-view";
import type { TeamStanding } from "./model";
import { usePreloadedVideos } from "./use-preloaded-videos";

type SaleRow = Database["public"]["Tables"]["sales"]["Row"];

// Catches anything Realtime missed (e.g. the TV slept) and rolls the month over.
const FALLBACK_REFRESH_MS = 5 * 60_000;

/**
 * The leaderboard, kept live: every sale insert queues a full-screen
 * celebration and re-fetches the standings from the server. `videoUrls` are
 * all teams' celebration videos, downloaded up front so they play instantly.
 */
export function LiveBoard({
  standings,
  videoUrls,
}: {
  standings: readonly TeamStanding[];
  videoUrls: readonly string[];
}) {
  const router = useRouter();
  const preloadedVideos = usePreloadedVideos(videoUrls);
  const [queue, setQueue] = useState<Celebration[]>([]);
  // Browsers only allow video with sound after someone interacts with the page.
  const [soundOn, setSoundOn] = useState(false);
  const hasSubscribedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("board-sales")
      .on<SaleRow>("postgres_changes", { event: "*", schema: "public", table: "sales" }, (payload) => {
        router.refresh();
        if (payload.eventType !== "INSERT") return;
        loadCelebration(supabase, payload.new).then((celebration) => {
          if (celebration) setQueue((current) => [...current, celebration]);
        });
      })
      .subscribe((status) => {
        // On re-subscribe after a dropped connection, catch up on missed sales.
        if (status !== "SUBSCRIBED") return;
        if (hasSubscribedRef.current) router.refresh();
        hasSubscribedRef.current = true;
      });

    const interval = setInterval(() => router.refresh(), FALLBACK_REFRESH_MS);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const finishCurrent = useCallback(() => setQueue((current) => current.slice(1)), []);
  const current = queue[0];

  return (
    <>
      <LeaderboardView standings={standings} />
      {current && (
        <CelebrationOverlay
          key={current.key}
          celebration={current}
          videoSrc={current.videoUrl && (preloadedVideos.get(current.videoUrl) ?? current.videoUrl)}
          soundOn={soundOn}
          onDone={finishCurrent}
        />
      )}
      <div className="fixed bottom-4 right-4 flex gap-2">
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

function BoardButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
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

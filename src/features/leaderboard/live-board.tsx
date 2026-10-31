"use client";

import { useCallback, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SalesFloorView } from "@/features/sales-floor/sales-floor-view";
import type { Database } from "@/lib/supabase/database.types";
import { videoPublicUrl } from "@/lib/supabase/storage";
import { CelebrationOverlay, type Celebration } from "./celebration-overlay";
import type { TeamStanding } from "./model";
import { useLiveSales, type SaleRow } from "./use-live-sales";
import { usePreloadedVideos } from "./use-preloaded-videos";

/**
 * The Sales Floor, kept live: every sale insert queues a full-screen
 * celebration and re-fetches the standings from the server. `videoUrls` are
 * all teams' celebration videos, downloaded up front so they play instantly.
 */
export function LiveBoard({
  standings,
  monthLabel,
  videoUrls,
}: {
  standings: readonly TeamStanding[];
  monthLabel: string;
  videoUrls: readonly string[];
}) {
  const preloadedVideos = usePreloadedVideos(videoUrls);
  const [queue, setQueue] = useState<Celebration[]>([]);
  // Browsers only allow video with sound after someone interacts with the page.
  const [soundOn, setSoundOn] = useState(false);

  useLiveSales("sales-floor", (supabase, sale) => {
    loadCelebration(supabase, sale).then((celebration) => {
      if (celebration) setQueue((current) => [...current, celebration]);
    });
  });

  const finishCurrent = useCallback(() => setQueue((current) => current.slice(1)), []);
  const current = queue[0];

  return (
    <>
      <SalesFloorView standings={standings} monthLabel={monthLabel} />
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

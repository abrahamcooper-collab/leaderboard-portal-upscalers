"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { listSalesSince, type NewSale } from "./actions";
import { CelebrationStage, type Celebration } from "./celebration-stage";
import { SoundtrackPlayer } from "@/features/soundtrack/soundtrack-player";
import { useLiveSales } from "./use-live-sales";
import { usePreloadedMedia } from "./use-preloaded-media";

// The TV controls fade out once the mouse has been still this long, so they don't sit on the board.
const CONTROLS_IDLE_MS = 4_000;
// Catching up after a dropped connection or a hidden tab: sales this recent still get their
// celebration (a few at most; see listSalesSince), so a TV waking from sleep doesn't replay a backlog.
const CATCH_UP_WINDOW_MS = 10 * 60_000;

/** An active agent, with what their sale's celebration shows. */
export type CelebrationAgent = { id: string; agentName: string; teamName: string; videoUrl: string | null };

/**
 * Keeps the TV pages live (see the boards layout): every new sale queues a
 * full-screen celebration over whatever is showing and re-fetches the page's
 * data. Each sale is celebrated once, whether it arrives live or is caught up
 * after a gap. `agents` lets a sale's celebration start the moment it
 * arrives, without a lookup; their teams' videos are downloaded and kept
 * ready to play. The admin's soundtrack loops in the background.
 */
export function LiveBoard({
  agents,
  soundtrackUrl,
  renderedAt,
  children,
}: {
  agents: readonly CelebrationAgent[];
  /** Background music for the TV pages, or null for none (chosen by an admin). */
  soundtrackUrl: string | null;
  /** When the server rendered the page (ISO); anchors "since the board opened" to the server's clock. */
  renderedAt: string;
  children: ReactNode;
}) {
  const videoUrls = [...new Set(agents.flatMap((agent) => (agent.videoUrl ? [agent.videoUrl] : [])))].sort();
  // One call for everything the boards play: the hook deletes stored files not in its list.
  const preloaded = usePreloadedMedia(soundtrackUrl ? [...videoUrls, soundtrackUrl] : videoUrls);
  const [queue, setQueue] = useState<Celebration[]>([]);
  // Browsers only allow video with sound after someone interacts with the page.
  const [soundOn, setSoundOn] = useState(false);

  // The latest agents, for the Realtime callback (which outlives renders).
  const agentsById = useRef(new Map<string, CelebrationAgent>());
  useEffect(() => {
    agentsById.current = new Map(agents.map((agent) => [agent.id, agent]));
  }, [agents]);

  // How far this device's clock is from the server's, so catch-up windows use server time.
  // TV clocks are often wrong; refreshed with every server render.
  const clockOffsetMs = useRef(0);
  useEffect(() => {
    clockOffsetMs.current = Date.parse(renderedAt) - Date.now();
  }, [renderedAt]);
  const serverNow = () => Date.now() + clockOffsetMs.current;

  const celebratedSaleIds = useRef(new Set<string>());
  // Server time of the newest sale seen; only later sales are celebrated. Starts at when the
  // board opened, set on mount, before useLiveSales's effect below can receive anything.
  const lastSaleAt = useRef(0);
  useEffect(() => {
    lastSaleAt.current = Date.parse(renderedAt);
    // Only on mount: later server renders must not move it back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const celebrate = (sale: NewSale) => {
    if (celebratedSaleIds.current.has(sale.id)) return;
    celebratedSaleIds.current.add(sale.id);
    const recordedAt = Date.parse(sale.createdAt);
    if (Number.isFinite(recordedAt)) lastSaleAt.current = Math.max(lastSaleAt.current, recordedAt);
    setQueue((current) => [...current, { key: sale.id, amount: sale.amount, agentName: sale.agentName, teamName: sale.teamName, videoUrl: sale.videoUrl }]);
  };

  /** Asks the server for sales since `since` (server ms): it reads them with the viewer's session. */
  const celebrateSalesSince = (since: number) => {
    const from = Number.isFinite(since) ? since : serverNow() - CATCH_UP_WINDOW_MS;
    listSalesSince(new Date(from).toISOString())
      .then((sales) => sales.forEach(celebrate))
      .catch((error: unknown) => console.warn("[board] Couldn't fetch new sales.", error));
  };

  useLiveSales("live-board", {
    onInsert: (sale) => {
      const agent = sale && agentsById.current.get(sale.agent_id);
      // Usual case: Realtime sent the sale and the agent is known, so it starts straight away.
      if (sale && agent) {
        celebrate({ id: sale.id, amount: sale.amount, createdAt: sale.created_at, agentName: agent.agentName, teamName: agent.teamName, videoUrl: agent.videoUrl });
        return;
      }
      // Details withheld, or an agent added since the page loaded: fetch everything since the last sale seen.
      celebrateSalesSince(lastSaleAt.current);
    },
    onResume: () => celebrateSalesSince(Math.max(lastSaleAt.current, serverNow() - CATCH_UP_WINDOW_MS)),
  });

  const finishCurrent = useCallback(() => setQueue((current) => current.slice(1)), []);
  const allowSound = useCallback(() => setSoundOn(true), []);
  const current = queue[0];
  const showControls = useRecentActivity(CONTROLS_IDLE_MS);

  return (
    <>
      {children}
      {soundtrackUrl && (
        <SoundtrackPlayer
          url={soundtrackUrl}
          localUrl={preloaded.get(soundtrackUrl)}
          // Quiet while a celebration video plays; it picks up where it left off.
          isPlaying={soundOn && !current}
          onSoundAllowed={allowSound}
        />
      )}
      <CelebrationStage
        videoUrls={videoUrls}
        sourcesFor={(videoUrl) => videoSourcesFor(videoUrl, preloaded)}
        current={current ?? null}
        soundOn={soundOn}
        onDone={finishCurrent}
      />
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
function videoSourcesFor(videoUrl: string, preloaded: ReadonlyMap<string, string>): string[] {
  const local = preloaded.get(videoUrl);
  return local ? [local, videoUrl] : [videoUrl];
}

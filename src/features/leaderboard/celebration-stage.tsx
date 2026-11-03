"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsd } from "@/lib/money";

export type Celebration = {
  /** The sale id; also restarts the video for back-to-back sales by the same team. */
  key: string;
  amount: number;
  agentName: string;
  teamName: string;
  /** The team's video in Storage, or null when the team has none. */
  videoUrl: string | null;
};

const NO_VIDEO_DURATION_MS = 7_000;
// Safety net so a stalled or very long video can't take over the board.
const MAX_VIDEO_DURATION_MS = 60_000;

/**
 * The full-screen celebration layer, above everything on the page. Every
 * team's video stays loaded and paused out of sight, so when a sale arrives
 * its video only has to appear and play: no download, no parsing, no
 * decoder start-up. `sourcesFor(url)` lists where to play a video from, best
 * first (the copy on this device, then streamed from Storage); if none works,
 * the no-video animation shows instead.
 */
export function CelebrationStage({
  videoUrls,
  sourcesFor,
  current,
  soundOn,
  onDone,
}: {
  videoUrls: readonly string[];
  sourcesFor: (videoUrl: string) => readonly string[];
  current: Celebration | null;
  soundOn: boolean;
  onDone: () => void;
}) {
  // The celebration whose video couldn't play from any source.
  const [unplayableKey, setUnplayableKey] = useState<string | null>(null);
  const showsVideo = current?.videoUrl != null && unplayableKey !== current.key;

  useEffect(() => {
    if (!current) return;
    const timeout = setTimeout(onDone, showsVideo ? MAX_VIDEO_DURATION_MS : NO_VIDEO_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [current, showsVideo, onDone]);

  // No page scrollbar beside the video, even on a board taller than the screen.
  useEffect(() => {
    if (!current) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [current]);

  return (
    <div
      aria-hidden={!current}
      className={`fixed inset-0 z-[100] flex items-end justify-center ${current ? "cursor-pointer bg-black" : "pointer-events-none"}`}
      onClick={current ? onDone : undefined}
      role={current ? "alert" : undefined}
    >
      {videoUrls.map((url) => (
        <StageVideo
          key={url}
          sources={sourcesFor(url)}
          celebrationKey={current?.videoUrl === url ? current.key : null}
          soundOn={soundOn}
          onEnded={onDone}
          onUnplayable={(key) => setUnplayableKey(key)}
        />
      ))}
      {current && !showsVideo && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-indigo-700 via-fuchsia-600 to-amber-500" />
      )}
      {current && (
        // Solid tint, not backdrop-blur: a blur over a playing video is redrawn every frame and stutters on TV hardware.
        <div className="relative mb-[8vh] rounded-3xl bg-black/75 px-12 py-8 text-center">
          <p className="text-[8vmin] font-black leading-none text-emerald-400 tabular-nums">{formatUsd(current.amount)}</p>
          <p className="mt-4 text-[4vmin] font-bold text-white">{current.agentName}</p>
          <p className="text-[3vmin] text-slate-300">{current.teamName}</p>
        </div>
      )}
    </div>
  );
}

/**
 * One team's video, always mounted and loaded. While `celebrationKey` is set
 * it's on screen, playing from the start; otherwise it's invisible, paused
 * and rewound, ready for the next sale.
 */
function StageVideo({
  sources: liveSources,
  celebrationKey,
  soundOn,
  onEnded,
  onUnplayable,
}: {
  sources: readonly string[];
  celebrationKey: string | null;
  soundOn: boolean;
  onEnded: () => void;
  onUnplayable: (celebrationKey: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isActive = celebrationKey !== null;

  // Pinned for the length of a celebration, so the device copy finishing its download mid-video doesn't restart it.
  const [pinned, setPinned] = useState<{ key: string; sources: readonly string[] } | null>(null);
  if (isActive && pinned?.key !== celebrationKey) setPinned({ key: celebrationKey, sources: liveSources });
  const sources = isActive && pinned?.key === celebrationKey ? pinned.sources : liveSources;

  // How many sources have failed, for this exact list (compared by content: the list is rebuilt every render).
  const sourcesKey = sources.join("\n");
  const [failed, setFailed] = useState({ sourcesKey, count: 0 });
  const failedCount = failed.sourcesKey === sourcesKey ? failed.count : 0;
  const src = sources[failedCount];

  // Read when playback starts, so turning sound on mid-video doesn't restart it.
  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
  });

  const skipSource = (failedSrc: string, reason: unknown) => {
    console.warn(`[board] Celebration video won't play from ${failedSrc}:`, reason);
    setFailed((current) => {
      const count = current.sourcesKey === sourcesKey ? current.count : 0;
      // A source's load error and its rejected play() both land here; skip it once.
      return sources[count] === failedSrc ? { sourcesKey, count: count + 1 } : current;
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isActive) {
      video.pause();
      if (video.currentTime !== 0) video.currentTime = 0;
      return;
    }
    if (!src) {
      onUnplayable(celebrationKey);
      return;
    }
    video.currentTime = 0;
    // If the browser refuses sound (nobody has clicked the page since it loaded), play muted rather than not at all.
    video.muted = !soundOnRef.current;
    video
      .play()
      .catch(() => {
        video.muted = true;
        return video.play();
      })
      .catch((error: unknown) => skipSource(src, error));
    // skipSource and onUnplayable are recreated each render; the effect should only rerun for a new sale or source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrationKey, isActive, src]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      preload="auto"
      // Invisible rather than display:none, so the browser keeps the first frame decoded and ready.
      className={`absolute inset-0 size-full object-cover ${isActive && src ? "opacity-100" : "opacity-0"}`}
      onEnded={isActive ? onEnded : undefined}
      onError={() => src && skipSource(src, "failed to load")}
    />
  );
}

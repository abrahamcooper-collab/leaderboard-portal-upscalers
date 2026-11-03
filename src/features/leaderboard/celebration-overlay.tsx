"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatUsd } from "@/lib/money";

export type Celebration = {
  /** The sale id; also remounts the overlay so back-to-back videos restart. */
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
 * Full-screen celebration for one sale, above everything on the page.
 * `videoSources` are tried in order (the copy kept on the device, then the
 * original streamed from Storage); if none plays, or there are none, the
 * no-video animation shows instead. Calls `onDone` when finished or clicked.
 */
export function CelebrationOverlay({
  celebration,
  videoSources,
  soundOn,
  onDone,
}: {
  celebration: Celebration;
  videoSources: readonly string[];
  soundOn: boolean;
  onDone: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Fixed when the celebration starts, so a download finishing mid-video doesn't restart it.
  const [sources] = useState(videoSources);
  const [sourceIndex, setSourceIndex] = useState(0);
  const videoSrc = sources[sourceIndex] ?? null;
  const hasVideo = videoSrc !== null;
  // Tied to the source that failed, so its load error and its rejected play() skip it only once.
  const skipSource = useCallback(
    (failedSrc: string, reason: unknown) => {
      console.warn(`[board] Celebration video for ${celebration.teamName} won't play from ${failedSrc}:`, reason);
      setSourceIndex((index) => (sources[index] === failedSrc ? index + 1 : index));
    },
    [celebration.teamName, sources],
  );

  useEffect(() => {
    const timeout = setTimeout(onDone, hasVideo ? MAX_VIDEO_DURATION_MS : NO_VIDEO_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [hasVideo, onDone]);

  // No page scrollbar beside the video, even on a board taller than the screen.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  // Started by hand rather than `autoPlay`: if the browser refuses sound (nobody has
  // clicked the page since it loaded), play muted instead of freezing on the first frame.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    video.muted = !soundOn;
    video
      .play()
      .catch(() => {
        video.muted = true;
        return video.play();
      })
      .catch((error: unknown) => skipSource(videoSrc, error));
  }, [videoSrc, soundOn, skipSource]);

  return (
    <div
      className="fixed inset-0 z-[100] flex cursor-pointer items-end justify-center bg-black"
      onClick={onDone}
      role="alert"
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 size-full object-cover"
          src={videoSrc}
          playsInline
          preload="auto"
          onEnded={onDone}
          onError={() => skipSource(videoSrc, "failed to load")}
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-indigo-700 via-fuchsia-600 to-amber-500" />
      )}
      {/* Solid tint, not backdrop-blur: a blur over a playing video is redrawn every frame and stutters on TV hardware. */}
      <div className="relative mb-[8vh] rounded-3xl bg-black/75 px-12 py-8 text-center">
        <p className="text-[8vmin] font-black leading-none text-emerald-400 tabular-nums">
          {formatUsd(celebration.amount)}
        </p>
        <p className="mt-4 text-[4vmin] font-bold text-white">{celebration.agentName}</p>
        <p className="text-[3vmin] text-slate-300">{celebration.teamName}</p>
      </div>
    </div>
  );
}

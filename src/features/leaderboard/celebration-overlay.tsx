"use client";

import { useEffect } from "react";
import { formatUsd } from "@/lib/money";

export type Celebration = {
  /** The sale id; also remounts the overlay so back-to-back videos restart. */
  key: string;
  /** The team's video in Storage, or null when the team has none. */
  amount: number;
  agentName: string;
  teamName: string;
  videoUrl: string | null;
};

const NO_VIDEO_DURATION_MS = 7_000;
// Safety net so a stalled or very long video can't take over the board.
const MAX_VIDEO_DURATION_MS = 60_000;

/**
 * Full-screen celebration for one sale. `videoSrc` is what to play (a
 * preloaded blob URL when available); null shows the no-video animation.
 * Calls `onDone` when finished or clicked.
 */
export function CelebrationOverlay({
  celebration,
  videoSrc,
  soundOn,
  onDone,
}: {
  celebration: Celebration;
  videoSrc: string | null;
  soundOn: boolean;
  onDone: () => void;
}) {
  const hasVideo = videoSrc !== null;
  useEffect(() => {
    const timeout = setTimeout(onDone, hasVideo ? MAX_VIDEO_DURATION_MS : NO_VIDEO_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [hasVideo, onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-end justify-center bg-black"
      onClick={onDone}
      role="alert"
    >
      {hasVideo ? (
        <video
          className="absolute inset-0 size-full object-contain"
          src={videoSrc}
          autoPlay
          playsInline
          muted={!soundOn}
          onEnded={onDone}
          onError={onDone}
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

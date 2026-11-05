"use client";

import { useEffect, useRef, useState } from "react";

// Background level, so speech in a celebration video and people in the room carry over it.
const VOLUME = 0.5;

/**
 * Loops the TV pages' soundtrack while `isPlaying`, pausing (and later
 * resuming where it was) otherwise, e.g. during a celebration video.
 * `localUrl` is the copy on this device when ready. Browsers only allow sound
 * after someone has clicked the page, unless the device permits it anyway:
 * `onSoundAllowed` reports that it started without a click, so the board can
 * treat sound as on.
 */
export function SoundtrackPlayer({
  url,
  localUrl,
  isPlaying,
  onSoundAllowed,
}: {
  url: string;
  localUrl: string | undefined;
  isPlaying: boolean;
  onSoundAllowed: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Pinned for this track, so the device copy finishing its download mid-song doesn't restart it.
  const [pinned, setPinned] = useState<{ url: string; src: string } | null>(null);
  if (pinned?.url !== url && (isPlaying || localUrl)) setPinned({ url, src: localUrl ?? url });
  const src = pinned?.url === url ? pinned.src : url;

  // Read inside effects without re-running them when the parent passes a new function.
  const onSoundAllowedRef = useRef(onSoundAllowed);
  useEffect(() => {
    onSoundAllowedRef.current = onSoundAllowed;
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;
    if (!isPlaying) {
      audio.pause();
      return;
    }
    audio.play().catch((error: unknown) => console.warn("[soundtrack] Couldn't start the soundtrack.", error));
  }, [isPlaying, src]);

  // Some TVs and kiosk browsers allow sound without a click: try once, quietly.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isPlaying) return;
    audio.volume = VOLUME;
    audio
      .play()
      .then(() => onSoundAllowedRef.current())
      .catch(() => undefined); // Expected on most browsers until someone clicks "Enable sound".
    // Only when the track first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return <audio ref={audioRef} src={src} loop preload="auto" />;
}

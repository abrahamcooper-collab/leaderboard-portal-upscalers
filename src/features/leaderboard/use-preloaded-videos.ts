"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Downloads each video once and returns a map of original URL → in-memory
 * blob URL, so a celebration starts instantly and replaying it costs no
 * bandwidth. URLs that drop out of the list are released. Until a video has
 * finished downloading it's absent from the map; callers fall back to the
 * original URL.
 */
export function usePreloadedVideos(urls: readonly string[]): ReadonlyMap<string, string> {
  const blobUrlsRef = useRef(new Map<string, string>());
  const [snapshot, setSnapshot] = useState<ReadonlyMap<string, string>>(() => new Map());
  // A stable key, so a re-render with the same URLs doesn't restart downloads.
  const key = [...urls].sort().join("\n");

  useEffect(() => {
    const wanted = new Set(key ? key.split("\n") : []);
    const blobUrls = blobUrlsRef.current;
    const publish = () => setSnapshot(new Map(blobUrls));

    let removedAny = false;
    for (const [url, blobUrl] of blobUrls) {
      if (wanted.has(url)) continue;
      blobUrls.delete(url);
      URL.revokeObjectURL(blobUrl);
      removedAny = true;
    }
    if (removedAny) publish();

    const controller = new AbortController();
    for (const url of wanted) {
      if (blobUrls.has(url)) continue;
      downloadAsBlobUrl(url, controller.signal).then((blobUrl) => {
        if (!blobUrl) return;
        blobUrls.set(url, blobUrl);
        publish();
      });
    }
    return () => controller.abort();
  }, [key]);

  useEffect(() => {
    const blobUrls = blobUrlsRef.current;
    return () => blobUrls.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
  }, []);

  return snapshot;
}

async function downloadAsBlobUrl(url: string, signal: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return URL.createObjectURL(await response.blob());
  } catch (error) {
    if (!signal.aborted) console.warn(`[board] Preloading ${url} failed; will stream instead.`, error);
    return null;
  }
}

"use client";

import { useEffect, useRef, useState } from "react";

// On-device store for the celebration videos (Cache Storage). Bump the version to discard them all.
const VIDEO_CACHE = "celebration-videos-v1";
// A failed preload (flaky wifi, TV just woke) tries again after these waits, then every 10 minutes.
const RETRY_DELAYS_MS = [30_000, 60_000, 2 * 60_000, 5 * 60_000, 10 * 60_000];

/**
 * Returns a map of original URL → in-memory blob URL, so a celebration starts
 * instantly. Each video is downloaded once per device and kept in the
 * browser's on-device cache, so reloads, page changes and restarts read it
 * from disk instead of the network. A replaced video has a new URL (uploads
 * get unique names), so a cached file never goes stale; ones no longer used
 * are deleted.
 *
 * Storage is only ever a speed-up: if the device has no cache, refuses to
 * store, runs out of space or the network drops, the video is kept in memory
 * or retried later, and until it's ready it's absent from the map so callers
 * stream the original URL instead.
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

    void forgetCachedVideosExcept(wanted);
    const controller = new AbortController();
    const retryTimers = new Set<ReturnType<typeof setTimeout>>();
    const preload = (url: string, attempt: number) => {
      loadAsBlobUrl(url, controller.signal).then((blobUrl) => {
        if (controller.signal.aborted) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          return;
        }
        if (blobUrl) {
          blobUrls.set(url, blobUrl);
          publish();
          return;
        }
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
        const timer = setTimeout(() => {
          retryTimers.delete(timer);
          preload(url, attempt + 1);
        }, delay);
        retryTimers.add(timer);
      });
    };
    for (const url of wanted) {
      if (!blobUrls.has(url)) preload(url, 0);
    }
    return () => {
      controller.abort();
      retryTimers.forEach(clearTimeout);
    };
  }, [key]);

  useEffect(() => {
    const blobUrls = blobUrlsRef.current;
    return () => blobUrls.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
  }, []);

  return snapshot;
}

/** The video as a blob URL, from the device's cache or the network; null if neither worked this time. */
async function loadAsBlobUrl(url: string, signal: AbortSignal): Promise<string | null> {
  try {
    const blob = (await readCached(url)) ?? (await download(url, signal));
    return URL.createObjectURL(blob);
  } catch (error) {
    if (!signal.aborted) console.warn(`[board] Preloading ${url} failed; streaming it until a retry succeeds.`, error);
    return null;
  }
}

/** Downloads the video and, alongside, tries to keep a copy on the device. A failed save never fails the download. */
async function download(url: string, signal: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const cache = await openVideoCache();
  // Saved from a copy of the stream, so the download itself is used either way.
  // put() commits only once the whole file is stored, so a dropped download leaves nothing half-saved.
  const saving = cache
    ?.put(url, response.clone())
    .catch((error: unknown) =>
      console.warn(`[board] Couldn't keep ${url} on this device (storage full or blocked); it will download again next time.`, error),
    );
  const blob = await response.blob();
  await saving;
  return blob;
}

/** The cached copy, or null when there isn't one or the cache can't be read (it then downloads instead). */
async function readCached(url: string): Promise<Blob | null> {
  try {
    const cache = await openVideoCache();
    const response = await cache?.match(url);
    return response ? await response.blob() : null;
  } catch (error) {
    console.warn(`[board] Couldn't read the cached copy of ${url}; downloading it instead.`, error);
    return null;
  }
}

/** Deletes cached videos no team uses any more (e.g. a replaced one). Best effort. */
async function forgetCachedVideosExcept(wanted: ReadonlySet<string>): Promise<void> {
  try {
    const cache = await openVideoCache();
    if (!cache) return;
    for (const request of await cache.keys()) {
      if (!wanted.has(request.url)) await cache.delete(request);
    }
  } catch {
    // Leftover files only cost space.
  }
}

/** Cache Storage exists only on https (and localhost), and can be blocked; then videos are kept in memory only. */
async function openVideoCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(VIDEO_CACHE);
  } catch {
    return null;
  }
}

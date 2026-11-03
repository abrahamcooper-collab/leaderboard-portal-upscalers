/**
 * Whether a celebration video will play instantly and smoothly on every
 * screen, TVs included. TV video chips decode up to 1080p at a modest bitrate
 * in hardware; above that they fall back to software and stutter. Phone and
 * screen-recording exports (1440p/4K, 60 fps, 20+ Mbps, index at the end of
 * the file) are the usual offenders.
 */

const MAX_LONG_SIDE_PX = 1920;
const MAX_SHORT_SIDE_PX = 1080;
const MAX_MEGABITS_PER_SECOND = 8;

export type VideoFacts = {
  width: number;
  height: number;
  durationSeconds: number;
  sizeBytes: number;
  /** Whether the file's index comes before the video data (so it can start before fully downloaded); null if unknown. */
  startsBeforeFullyLoaded: boolean | null;
};

export const HOW_TO_EXPORT =
  "Export it as an MP4 at 1080p, 30 fps (in CapCut or InShot choose 1080p; in HandBrake use the “Fast 1080p30” preset with “Web Optimized” ticked), then upload that.";

/** The reasons a video won't play instantly on a TV, in plain words; empty when it's fine. */
export function videoProblems(video: VideoFacts): string[] {
  const problems: string[] = [];
  const longSide = Math.max(video.width, video.height);
  const shortSide = Math.min(video.width, video.height);
  if (longSide > MAX_LONG_SIDE_PX || shortSide > MAX_SHORT_SIDE_PX) {
    problems.push(`it's ${video.width}×${video.height}, larger than 1080p`);
  }
  if (video.durationSeconds > 0) {
    const megabitsPerSecond = (video.sizeBytes * 8) / video.durationSeconds / 1_000_000;
    if (megabitsPerSecond > MAX_MEGABITS_PER_SECOND) {
      problems.push(`it's encoded at ${Math.round(megabitsPerSecond)} Mbps (TVs need ${MAX_MEGABITS_PER_SECOND} or less)`);
    }
  }
  if (video.startsBeforeFullyLoaded === false) {
    problems.push("it can't start playing until it has fully downloaded");
  }
  return problems;
}

/** Reads what `videoProblems` needs from a file, in the browser. Rejects if the browser can't play the file at all. */
export async function readVideoFacts(file: File): Promise<VideoFacts> {
  const [dimensions, startsBeforeFullyLoaded] = await Promise.all([readDimensions(file), indexComesFirst(file)]);
  return { ...dimensions, sizeBytes: file.size, startsBeforeFullyLoaded };
}

const METADATA_TIMEOUT_MS = 15_000;

function readDimensions(file: File): Promise<Pick<VideoFacts, "width" | "height" | "durationSeconds">> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const finish = (result: () => void) => {
      clearTimeout(timeout);
      video.removeAttribute("src");
      URL.revokeObjectURL(url);
      result();
    };
    const timeout = setTimeout(() => finish(() => reject(new Error("timed out reading the video"))), METADATA_TIMEOUT_MS);
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      finish(() => resolve({ width: video.videoWidth, height: video.videoHeight, durationSeconds: video.duration }));
    video.onerror = () => finish(() => reject(new Error("this browser can't play the file")));
    video.src = url;
  });
}

const HEADER_BYTES = 16;
const MAX_TOP_LEVEL_BOXES = 50;

/**
 * For MP4/MOV files: walks the top-level boxes to see whether the index
 * ("moov") comes before the media data ("mdat"). Null for other formats.
 */
async function indexComesFirst(file: File): Promise<boolean | null> {
  let offset = 0;
  for (let i = 0; i < MAX_TOP_LEVEL_BOXES && offset + 8 <= file.size; i++) {
    const header = new DataView(await file.slice(offset, offset + HEADER_BYTES).arrayBuffer());
    const type = String.fromCharCode(...[4, 5, 6, 7].map((index) => header.getUint8(index)));
    if (type === "moov") return true;
    if (type === "mdat") return false;
    const size32 = header.getUint32(0);
    // 1 = 64-bit size follows the type; 0 = box runs to the end of the file.
    const size = size32 === 1 ? Number(header.getBigUint64(8)) : size32;
    if (size < 8) return null;
    offset += size;
  }
  return null;
}

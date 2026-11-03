import { describe, expect, it } from "vitest";
import { videoProblems, type VideoFacts } from "./video-check";

const fine: VideoFacts = { width: 1920, height: 1080, durationSeconds: 12, sizeBytes: 7_000_000, startsBeforeFullyLoaded: true };

describe("videoProblems", () => {
  it("accepts a 1080p video at a modest bitrate that starts early", () => {
    expect(videoProblems(fine)).toEqual([]);
  });

  it("accepts portrait 1080p too", () => {
    expect(videoProblems({ ...fine, width: 1080, height: 1920 })).toEqual([]);
  });

  // The real uploads that lagged on the boards.
  it("rejects a 1440p, 22 Mbps phone export whose index is at the end", () => {
    const problems = videoProblems({ width: 2558, height: 1440, durationSeconds: 13.6, sizeBytes: 37_423_704, startsBeforeFullyLoaded: false });
    expect(problems).toHaveLength(3);
    expect(problems[0]).toContain("2558×1440");
    expect(problems[1]).toContain("22 Mbps");
  });

  it("rejects a 1080p video that is far too heavy", () => {
    expect(videoProblems({ ...fine, sizeBytes: 32_384_274, durationSeconds: 12.4 })).toEqual([
      "it's encoded at 21 Mbps (TVs need 8 or less)",
    ]);
  });

  it("doesn't guess when the index position is unknown (e.g. WebM)", () => {
    expect(videoProblems({ ...fine, startsBeforeFullyLoaded: null })).toEqual([]);
  });
});

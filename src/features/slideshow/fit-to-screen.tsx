"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** A laptop's width: the boards are laid out at least this wide, so TVs that report a narrower page get the same layout, scaled down. */
export const BOARD_LAYOUT_WIDTH = 1280;
// Below this width (phones) the content flows and scrolls normally instead.
const MIN_FIT_WIDTH_PX = 768;
// Ignore scale changes smaller than this, so re-layout can't make it jitter.
const SCALE_TOLERANCE = 0.005;

/**
 * Makes a TV board look the same on every screen, edge to edge. Content is
 * laid out at least `minLayoutWidth` wide (a laptop's layout, so TVs that
 * report a narrow page width don't squeeze or wrap it) and then shrunk to the
 * screen, never enlarged.
 *
 * - `fill`: the content fills the screen exactly (it sizes itself to the
 *   space given, like the Sales Floor).
 * - `contain`: the content keeps its natural height, and is also shrunk until
 *   all of it fits (like the race); it's laid out wider by the same factor so
 *   it still spans the full width. `background` fills any space left below.
 *
 * On phones it does nothing: the content flows and scrolls normally.
 */
export function FitToScreen({
  mode,
  minLayoutWidth,
  background,
  children,
}: {
  mode: "fill" | "contain";
  minLayoutWidth: number;
  background: string;
  children: ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;
    const refit = () => {
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      if (width < MIN_FIT_WIDTH_PX) {
        setFit(null);
        return;
      }
      const widthScale = Math.min(1, width / minLayoutWidth);
      // offsetHeight is the content's own height at its current layout width (transforms don't affect layout).
      const scale = mode === "contain" ? Math.min(widthScale, height / content.offsetHeight) : widthScale;
      setFit((current) =>
        current && current.width === width && current.height === height && Math.abs(current.scale - scale) < SCALE_TOLERANCE
          ? current
          : { scale, width, height },
      );
    };
    const observer = new ResizeObserver(refit);
    observer.observe(frame);
    if (mode === "contain") observer.observe(content);
    return () => observer.disconnect();
  }, [mode, minLayoutWidth]);

  return (
    <div
      ref={frameRef}
      className={`relative h-full w-full ${fit ? "overflow-hidden" : "overflow-y-auto"}`}
      style={{ background }}
    >
      <div
        ref={contentRef}
        className="flex origin-top-left flex-col"
        style={{
          // The boards size text and spacing in container units (cqw/cqh), measured against this
          // box's layout size, so a board shrunk to fit looks exactly like the laptop version.
          // Only "fill" has a fixed height to measure; elsewhere cqh falls back to the screen's.
          containerType: fit && mode === "fill" ? "size" : "inline-size",
          ...(fit
            ? {
                // Laid out larger by 1/scale, then shrunk, so it ends up exactly screen-wide.
                width: fit.width / fit.scale,
                ...(mode === "fill" ? { height: fit.height / fit.scale } : {}),
                transform: `scale(${fit.scale})`,
              }
            : { minHeight: "100%" }),
        }}
      >
        {children}
      </div>
    </div>
  );
}

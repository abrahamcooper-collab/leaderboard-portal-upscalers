"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Shrinks its content (never enlarges it) until it fits the available height,
 * so a board built for a 1080p TV still shows whole on a shorter screen
 * instead of being cut off at the bottom. `background` fills the space either
 * side of shrunken content, so it blends into the board.
 */
export function FitToScreen({ background, children }: { background: string; children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;
    // offsetHeight is the unscaled height: transforms don't affect layout.
    const fit = () => setScale(Math.min(1, frame.clientHeight / content.offsetHeight));
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="relative h-full w-full overflow-hidden" style={{ background }}>
      <div ref={contentRef} className="flex min-h-full origin-top flex-col" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

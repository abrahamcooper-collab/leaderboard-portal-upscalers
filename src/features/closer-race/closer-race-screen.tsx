import type { ReactNode } from "react";

/**
 * The closer race's full-screen backdrop, on its own page and in the slideshow.
 * No side padding: the track runs edge to edge; the view pads its other content.
 */
export function CloserRaceScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh flex-1 bg-[#0b1120] bg-[radial-gradient(ellipse_at_top,#16233b_0%,#0b1120_60%)] py-[clamp(1rem,2.5cqh,2.5rem)]">
      {children}
    </div>
  );
}

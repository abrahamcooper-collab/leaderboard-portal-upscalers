import type { ReactNode } from "react";

/** The closer race's full-screen backdrop, on its own page and in the slideshow. */
export function CloserRaceScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh flex-1 bg-[#0b1120] bg-[radial-gradient(ellipse_at_top,#16233b_0%,#0b1120_60%)] px-[clamp(1rem,2.5vw,3rem)] py-[clamp(1rem,2.5vh,2.5rem)]">
      {children}
    </div>
  );
}

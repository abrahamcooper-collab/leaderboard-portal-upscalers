import type { ReactNode } from "react";
import { salesFloorFontVariables } from "./fonts";

/** The Sales Floor's full-screen chalkboard backdrop, on its own page and in the slideshow. */
export function SalesFloorScreen({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${salesFloorFontVariables} relative flex min-h-dvh flex-1 flex-col md:h-dvh md:overflow-hidden bg-[#070707] bg-[radial-gradient(ellipse_at_top,#1d1d1f_0%,#070707_65%)] px-[clamp(1rem,2.5vw,3rem)] py-[clamp(1rem,2vw,2.5rem)]`}
    >
      {children}
    </div>
  );
}

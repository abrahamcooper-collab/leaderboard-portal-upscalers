import type { ReactNode } from "react";
import { salesFloorFontVariables } from "./fonts";

/**
 * The Sales Floor's full-screen chalkboard backdrop, on its own page and in the
 * slideshow. It fills the space it's given (see FitToScreen's "fill" mode); on
 * phones it grows with its content instead.
 */
export function SalesFloorScreen({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${salesFloorFontVariables} relative flex min-h-dvh flex-1 flex-col md:min-h-0 md:overflow-hidden bg-[#070707] bg-[radial-gradient(ellipse_at_top,#1d1d1f_0%,#070707_65%)] px-[clamp(1rem,2.5cqw,3rem)] py-[clamp(1rem,2cqw,2.5rem)]`}
    >
      {children}
    </div>
  );
}

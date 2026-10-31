"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Slide = { id: string; durationMs: number; content: ReactNode };

/** How long one slide takes to fade into the next. */
const CROSSFADE_MS = 1500;

type SlideState = {
  /** Whether this slide is the one on screen (or fading in). */
  isActive: boolean;
  /** How many times this slide has come on screen; 0 before its first time. */
  visit: number;
};

// Outside a slideshow (a page on its own), the content is always on screen, on its one visit.
const SlideContext = createContext<SlideState>({ isActive: true, visit: 1 });

/** Lets slide content react to coming on screen, e.g. page 4 swapping its image. */
export function useSlide(): SlideState {
  return useContext(SlideContext);
}

/**
 * Loops through `slides` forever, cross-fading each into the next. Every
 * slide stays mounted, so its data, images and animations are ready before
 * it fades in, and a fade is only an opacity change.
 */
export function Slideshow({ slides }: { slides: readonly Slide[] }) {
  // Total advances so far; the slide on screen is `step % slides.length`.
  const [step, setStep] = useState(0);
  const activeIndex = step % slides.length;
  const durationMs = slides[activeIndex].durationMs;

  // Keyed on the step and duration, not `slides`: live data arrives as a new
  // `slides` array, and that mustn't restart the current slide's timer.
  useEffect(() => {
    const timeout = setTimeout(() => setStep((current) => current + 1), durationMs);
    return () => clearTimeout(timeout);
  }, [step, durationMs]);

  return (
    <div className="relative h-dvh overflow-hidden bg-black">
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        const visit = step < index ? 0 : Math.floor((step - index) / slides.length) + 1;
        return (
          <SlideContext.Provider key={slide.id} value={{ isActive, visit }}>
            <section
              aria-hidden={!isActive}
              className={`absolute inset-0 flex flex-col overflow-hidden transition-[opacity,visibility] ease-in-out will-change-[opacity] ${
                isActive ? "visible z-10 opacity-100" : "invisible z-0 opacity-0"
              }`}
              style={{ transitionDuration: `${CROSSFADE_MS}ms` }}
            >
              {slide.content}
            </section>
          </SlideContext.Provider>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { StaticImageData } from "next/image";
import { FullScreenImage } from "./full-screen-image";
import { useSlide } from "./slideshow";

// Remembers, per browser, which image showed last, so the next visit shows the other.
const LAST_SHOWN_KEY = "page4:last-shown";

/**
 * Page 4: shows one of two images, the other one each time it's visited,
 * whether opened as a page or coming round in the slideshow.
 */
export function AlternatingImage({ images, alt }: { images: readonly [StaticImageData, StaticImageData]; alt: string }) {
  const { isActive, visit } = useSlide();
  // Null until this visit's image is picked; the screen stays black meanwhile.
  const [shown, setShown] = useState<0 | 1 | null>(null);
  const handledVisit = useRef(0);

  useEffect(() => {
    // The ref keeps a visit from flipping twice (React re-runs effects in development).
    if (!isActive || handledVisit.current === visit) return;
    handledVisit.current = visit;
    const next = readLastShown() === 0 ? 1 : 0;
    writeLastShown(next);
    // Picked after mount: the choice lives in the browser, so the server can't render it.
    setShown(next);
  }, [isActive, visit]);

  return (
    <div className="absolute inset-0 bg-black">
      {images.map((image, index) => (
        <div
          key={image.src}
          className={`absolute inset-0 transition-opacity duration-500 ${index === shown ? "opacity-100" : "opacity-0"}`}
        >
          <FullScreenImage src={image} alt={alt} />
        </div>
      ))}
    </div>
  );
}

// Storage can be unavailable (private mode, blocked site data); then every visit shows the first image.
function readLastShown(): 0 | 1 | null {
  try {
    const value = localStorage.getItem(LAST_SHOWN_KEY);
    return value === "0" ? 0 : value === "1" ? 1 : null;
  } catch {
    return null;
  }
}

function writeLastShown(index: 0 | 1): void {
  try {
    localStorage.setItem(LAST_SHOWN_KEY, String(index));
  } catch {
    // Not remembered; the next visit starts from the first image again.
  }
}

import Image, { type StaticImageData } from "next/image";

/**
 * One picture filling the screen, shown whole (never cropped) on black. The
 * pictures are artwork on black, so the space either side blends in.
 */
export function FullScreenImage({ src, alt }: { src: StaticImageData; alt: string }) {
  return (
    <div className="absolute inset-0 bg-black">
      {/* Eager: in the slideshow this sits on a hidden slide and must be ready before it fades in. */}
      <Image src={src} alt={alt} fill sizes="100vw" loading="eager" className="object-contain" />
    </div>
  );
}

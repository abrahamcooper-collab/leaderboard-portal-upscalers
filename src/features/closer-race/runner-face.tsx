import Image from "next/image";
import type { AvatarSrc } from "@/features/teams/avatars";
import type { Mood } from "./model";

// Stand-ins for a closer without an avatar.
const MOOD_EMOJI: Record<Mood, string> = { happy: "😄", neutral: "😐", sad: "😞" };

/** A closer's avatar, ringed in `--team-accent`; a mood emoji when they have none. */
export function RunnerFace({
  name,
  src,
  mood,
  size,
}: {
  name: string;
  src: AvatarSrc | null;
  mood: Mood;
  size: number;
}) {
  // max-w-none: on the runner the face sits in a narrower wrapper, and Tailwind's
  // base `img { max-width: 100% }` would squash it.
  const className = "shrink-0 max-w-none rounded-full bg-slate-900 ring-2 ring-[var(--team-accent)]";
  const style = { width: size, height: size };

  if (src) {
    return (
      <Image
        src={src}
        alt={`${name} (${mood})`}
        width={size}
        height={size}
        // Same rule as the Sales Floor avatar: resize bundled photos, not uploads.
        unoptimized={typeof src === "string"}
        className={`${className} object-cover`}
        style={style}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={`${name} (${mood})`}
      className={`${className} flex items-center justify-center leading-none`}
      style={{ ...style, fontSize: size * 0.68 }}
    >
      {MOOD_EMOJI[mood]}
    </span>
  );
}

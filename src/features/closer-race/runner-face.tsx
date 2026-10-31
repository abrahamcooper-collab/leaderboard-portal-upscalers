import Image from "next/image";
import { avatarPublicUrl } from "@/lib/supabase/storage";
import type { Mood } from "./model";

// Stand-ins until a closer's bitmojis are uploaded.
const MOOD_EMOJI: Record<Mood, string> = { happy: "😄", neutral: "😐", sad: "😞" };

/** A closer's bitmoji for their current mood, ringed in `--team-accent`. */
export function RunnerFace({
  name,
  path,
  mood,
  size,
}: {
  name: string;
  path: string | null;
  mood: Mood;
  size: number;
}) {
  const className = "shrink-0 rounded-full bg-slate-900 ring-2 ring-[var(--team-accent)]";
  const style = { width: size, height: size };

  if (path) {
    return (
      <Image
        src={avatarPublicUrl(path)}
        alt={`${name} (${mood})`}
        width={size}
        height={size}
        unoptimized
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

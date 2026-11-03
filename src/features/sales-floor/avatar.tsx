import Image from "next/image";
import type { AvatarSrc } from "@/features/teams/avatars";

// Initials need different colours on the dark TV boards and the light admin and portal pages.
const INITIALS_TONE = {
  dark: "bg-white/5 text-white/70",
  light: "bg-slate-200 text-slate-600",
} as const;

/**
 * A person's avatar in a circle, or their initials when they have none.
 * The ring takes the team colour from the surrounding `--team-accent`
 * (pages without one, like the admin screens, show no ring).
 */
export function Avatar({
  name,
  src,
  size,
  tone = "dark",
}: {
  name: string;
  src: AvatarSrc | null;
  size: number;
  /** The page behind the avatar: the dark boards or the light admin and portal pages. */
  tone?: keyof typeof INITIALS_TONE;
}) {
  const style = { width: size, height: size };
  const ring = "shrink-0 rounded-full ring-2 ring-[var(--team-accent)]";

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        // Uploaded avatars are small and come straight from Supabase Storage's CDN;
        // bundled team photos are large, so Next.js serves resized copies.
        unoptimized={typeof src === "string"}
        // Cropped from the top: in a portrait photo the face is near the top, so the head stays whole.
        className={`${ring} bg-black object-cover object-top`}
        style={style}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${ring} flex items-center justify-center font-[family-name:var(--font-condensed)] font-semibold ${INITIALS_TONE[tone]}`}
      style={{ ...style, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

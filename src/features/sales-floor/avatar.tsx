import Image from "next/image";
import type { AvatarSrc } from "@/features/teams/avatars";

/**
 * A person's avatar in a circle, or their initials when they have none.
 * The ring takes the team colour from the surrounding `--team-accent`.
 */
export function Avatar({
  name,
  src,
  size,
}: {
  name: string;
  src: AvatarSrc | null;
  size: number;
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
        className={`${ring} bg-black object-cover`}
        style={style}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${ring} flex items-center justify-center bg-white/5 font-[family-name:var(--font-condensed)] font-semibold text-white/70`}
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

import Image from "next/image";
import { avatarPublicUrl } from "@/lib/supabase/storage";

/**
 * A person's bitmoji in a circle, or their initials until one is uploaded.
 * The ring takes the team colour from the surrounding `--team-accent`.
 */
export function Avatar({
  name,
  path,
  size,
}: {
  name: string;
  path: string | null;
  size: number;
}) {
  const style = { width: size, height: size };
  const ring = "shrink-0 rounded-full ring-2 ring-[var(--team-accent)]";

  if (path) {
    return (
      <Image
        src={avatarPublicUrl(path)}
        alt={name}
        width={size}
        height={size}
        // Bitmojis are small and come straight from Supabase Storage's CDN.
        unoptimized
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

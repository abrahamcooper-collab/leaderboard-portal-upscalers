import { publicEnv } from "@/lib/env";

export const VIDEO_BUCKET = "celebration-videos";
export const AVATAR_BUCKET = "avatars";

/** Public URL for an object in the (public) celebration video bucket. */
export function videoPublicUrl(path: string): string {
  return publicObjectUrl(VIDEO_BUCKET, path);
}

/** Public URL for a closer's or agent's uploaded avatar. */
export function avatarPublicUrl(path: string): string {
  return publicObjectUrl(AVATAR_BUCKET, path);
}

function publicObjectUrl(bucket: string, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}

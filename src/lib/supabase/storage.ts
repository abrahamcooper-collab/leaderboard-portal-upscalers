import { publicEnv } from "@/lib/env";

export const VIDEO_BUCKET = "celebration-videos";
export const AVATAR_BUCKET = "avatars";
export const SOUNDTRACK_BUCKET = "soundtracks";
/** The folder in SOUNDTRACK_BUCKET the admin uploader writes to. */
export const SOUNDTRACK_FOLDER = "tracks";

/** Public URL for an object in the (public) celebration video bucket. */
export function videoPublicUrl(path: string): string {
  return publicObjectUrl(VIDEO_BUCKET, path);
}

/** Public URL for a closer's or agent's uploaded avatar. */
export function avatarPublicUrl(path: string): string {
  return publicObjectUrl(AVATAR_BUCKET, path);
}

/** Public URL for the TV pages' background soundtrack. */
export function soundtrackPublicUrl(path: string): string {
  return publicObjectUrl(SOUNDTRACK_BUCKET, path);
}

function publicObjectUrl(bucket: string, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}

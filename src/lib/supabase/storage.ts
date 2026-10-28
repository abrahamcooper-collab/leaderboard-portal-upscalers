import { publicEnv } from "@/lib/env";

export const VIDEO_BUCKET = "celebration-videos";

/** Public URL for an object in the (public) celebration video bucket. */
export function videoPublicUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${VIDEO_BUCKET}/${encoded}`;
}

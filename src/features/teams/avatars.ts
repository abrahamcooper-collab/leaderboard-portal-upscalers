import type { StaticImageData } from "next/image";
import { avatarPublicUrl } from "@/lib/supabase/storage";
import { agentPhoto, closerPhoto } from "./roster-photos";

/** An avatar image: an uploaded avatar's URL, or a bundled team photo. */
export type AvatarSrc = string | StaticImageData;

/** A closer's uploaded avatar, else their team photo; null shows a placeholder. */
export function closerAvatarSrc(teamName: string, uploadedPath: string | null): AvatarSrc | null {
  return uploadedPath ? avatarPublicUrl(uploadedPath) : closerPhoto(teamName);
}

/** An agent's uploaded avatar, else their team photo; null shows a placeholder. */
export function agentAvatarSrc(teamName: string, agentName: string, uploadedPath: string | null): AvatarSrc | null {
  return uploadedPath ? avatarPublicUrl(uploadedPath) : agentPhoto(teamName, agentName);
}

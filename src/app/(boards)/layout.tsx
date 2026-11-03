import type { ReactNode } from "react";
import { LiveBoard } from "@/features/leaderboard/live-board";
import { listTeams } from "@/features/teams/queries";
import { requireUser } from "@/lib/auth";
import { videoPublicUrl } from "@/lib/supabase/storage";

/**
 * Shared by every TV page (Sales Floor, Operations Closeout, pages 3 and 4,
 * the slideshow): a sale plays its team's video full screen over whichever
 * one is showing. Because the layout stays mounted while moving between
 * them, the live connection, the downloaded videos and "Enable sound" carry
 * over instead of starting again on each page.
 */
export default async function BoardsLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const teams = await listTeams();
  const videoUrls = teams.flatMap((team) => (team.videoPath ? [videoPublicUrl(team.videoPath)] : []));

  return <LiveBoard videoUrls={videoUrls}>{children}</LiveBoard>;
}

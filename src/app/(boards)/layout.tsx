import type { ReactNode } from "react";
import { LiveBoard } from "@/features/leaderboard/live-board";
import { listCelebrationAgents } from "@/features/teams/queries";
import { requireUser } from "@/lib/auth";
import { videoPublicUrl } from "@/lib/supabase/storage";

/**
 * Shared by every TV page (Sales Floor, Operations Closeout, pages 3 and 4,
 * the slideshow): a sale plays its team's video full screen over whichever
 * one is showing. Because the layout stays mounted while moving between
 * them, the live connection, the ready-to-play videos and "Enable sound"
 * carry over instead of starting again on each page.
 */
export default async function BoardsLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const agents = await listCelebrationAgents();
  const celebrationAgents = agents.map(({ videoPath, ...agent }) => ({
    ...agent,
    videoUrl: videoPath ? videoPublicUrl(videoPath) : null,
  }));

  // The server's clock, so "sales since the board opened" doesn't depend on a TV's (often wrong) time.
  const renderedAt = new Date().toISOString();

  return (
    <LiveBoard agents={celebrationAgents} renderedAt={renderedAt}>
      {children}
    </LiveBoard>
  );
}

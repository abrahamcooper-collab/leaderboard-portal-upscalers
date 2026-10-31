import { BoardExitLink } from "@/components/board-exit-link";
import { RUN_AFTER_SALE_MS, summarizeRace, toRaceRunners } from "@/features/closer-race/model";
import { CloserRaceScreen } from "@/features/closer-race/closer-race-screen";
import { CloserRaceView } from "@/features/closer-race/closer-race-view";
import { LiveBoard } from "@/features/leaderboard/live-board";
import { getStandings } from "@/features/leaderboard/queries";
import { getRecentSalesByTeam } from "@/features/sales/queries";
import { SalesFloorScreen } from "@/features/sales-floor/sales-floor-screen";
import { SalesFloorView } from "@/features/sales-floor/sales-floor-view";
import { AlternatingImage } from "@/features/slideshow/alternating-image";
import { FitToScreen } from "@/features/slideshow/fit-to-screen";
import { FullScreenImage } from "@/features/slideshow/full-screen-image";
import { PAGE_3_IMAGE, PAGE_4_IMAGES } from "@/features/slideshow/images";
import { Slideshow, type Slide } from "@/features/slideshow/slideshow";
import { listTeams } from "@/features/teams/queries";
import { requireUser } from "@/lib/auth";
import { currentMonth } from "@/lib/current-month";
import { formatMonth } from "@/lib/month";
import { videoPublicUrl } from "@/lib/supabase/storage";

// Boards stay up long enough to read; the pictures are a short breather between laps.
const BOARD_SLIDE_MS = 20_000;
const PICTURE_SLIDE_MS = 10_000;

/**
 * The slideshow for the TV: Sales Floor → Operations Closeout → page 3 → page 4,
 * on a loop. Live like the boards themselves: sales update the numbers and
 * play their team's celebration over whichever slide is showing.
 */
export default async function SlideshowPage() {
  const user = await requireUser();
  const month = currentMonth();
  const monthLabel = formatMonth(month);
  const [standings, teams, recentSalesByTeam] = await Promise.all([
    getStandings(month),
    listTeams(),
    getRecentSalesByTeam(RUN_AFTER_SALE_MS),
  ]);
  const videoUrls = teams.flatMap((team) => (team.videoPath ? [videoPublicUrl(team.videoPath)] : []));
  const runners = toRaceRunners(standings);

  const slides: Slide[] = [
    {
      id: "sales-floor",
      durationMs: BOARD_SLIDE_MS,
      content: (
        <FitToScreen background="#070707">
          <SalesFloorScreen>
            <SalesFloorView standings={standings} monthLabel={monthLabel} />
          </SalesFloorScreen>
        </FitToScreen>
      ),
    },
    {
      id: "operations-closeout",
      durationMs: BOARD_SLIDE_MS,
      content: (
        <FitToScreen background="#0b1120">
          <CloserRaceScreen>
            <CloserRaceView runners={runners} summary={summarizeRace(runners)} recentSalesByTeam={recentSalesByTeam} monthLabel={monthLabel} />
          </CloserRaceScreen>
        </FitToScreen>
      ),
    },
    { id: "page-3", durationMs: PICTURE_SLIDE_MS, content: <FullScreenImage src={PAGE_3_IMAGE} alt="Creative Giants" /> },
    { id: "page-4", durationMs: PICTURE_SLIDE_MS, content: <AlternatingImage images={PAGE_4_IMAGES} alt="Creative Giants" /> },
  ];

  return (
    <main className="relative flex-1 bg-black">
      <LiveBoard videoUrls={videoUrls}>
        <Slideshow slides={slides} />
      </LiveBoard>
      <BoardExitLink role={user.role} />
    </main>
  );
}

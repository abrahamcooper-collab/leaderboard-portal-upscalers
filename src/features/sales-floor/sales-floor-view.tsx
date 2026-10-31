import Image from "next/image";
import type { TeamStanding } from "@/features/leaderboard/model";
import { sortByTeamOrder } from "@/features/teams/team-order";
import { TeamPanel } from "./team-panel";
import logo from "../../../public/logo.jpeg";

// Enough rows that a small team's table still looks like a full board.
const MIN_ROWS = 10;
const TAGLINES = ["Discipline", "Focus", "Consistency", "Success"];

/**
 * The Sales Floor chalkboard: logo and title, then one colour-coded panel per
 * team in a fixed order (see team-order.ts); within a team, agents are ranked by sales.
 */
export function SalesFloorView({
  standings,
  monthLabel,
}: {
  standings: readonly TeamStanding[];
  monthLabel: string;
}) {
  const teams = sortByTeamOrder(standings, (team) => team.name);
  const rowCount = Math.max(MIN_ROWS, ...teams.map((team) => team.agents.length));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[min(1.5rem,2vh)]">
      <header className="grid shrink-0 grid-cols-1 items-center gap-6 md:grid-cols-[1fr_2fr_1fr]">
        {/* Cropped above the logo's tagline; the soft mask hides the image's square edge. */}
        <div className="relative mx-auto aspect-[1254/960] w-[clamp(8rem,min(13vw,22vh),14rem)] overflow-hidden [mask-image:radial-gradient(ellipse_at_center,black_62%,transparent_80%)] md:mx-0">
          <Image src={logo} alt="Creative Giants" fill preload sizes="14rem" className="object-cover object-top" />
        </div>

        <div className="text-center">
          <h1 className="inline-flex -rotate-2 flex-col font-[family-name:var(--font-marker)] uppercase leading-[0.9] text-zinc-100 [text-shadow:0_2px_0_#000,0_0_24px_rgba(255,255,255,0.15)]">
            <span className="text-[clamp(2.25rem,min(5vw,8.5vh),5.5rem)]">Sales</span>
            <span className="text-[clamp(2.25rem,min(5vw,8.5vh),5.5rem)]">Leaderboard</span>
          </h1>
          <div className="mx-auto mt-2 h-1.5 w-2/3 -rotate-1 rounded-full bg-gradient-to-r from-transparent via-red-600 to-transparent" />
          <p className="mt-3 font-[family-name:var(--font-condensed)] text-sm uppercase tracking-[0.4em] text-zinc-400">
            {monthLabel}
          </p>
        </div>

        <ul className="hidden justify-self-end border-l border-zinc-600 pl-6 font-[family-name:var(--font-condensed)] text-[clamp(0.9rem,1.3vw,1.4rem)] font-light uppercase leading-relaxed tracking-[0.3em] text-zinc-300 md:block">
          {TAGLINES.map((tagline) => (
            <li key={tagline}>{tagline}</li>
          ))}
        </ul>
      </header>

      {teams.length === 0 ? (
        <p className="py-24 text-center text-lg text-zinc-500">No teams yet.</p>
      ) : (
        <div className="grid min-h-0 flex-1 gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
          {teams.map((team) => (
            <TeamPanel key={team.id} team={team} rowCount={rowCount} />
          ))}
        </div>
      )}

      <footer className="flex shrink-0 items-center gap-6 font-[family-name:var(--font-condensed)] text-xs uppercase tracking-[0.45em] text-zinc-400">
        <span className="shrink-0">We don&apos;t do average</span>
        <span className="h-px flex-1 bg-zinc-600" />
        <span className="shrink-0">Creative Giants</span>
      </footer>
    </div>
  );
}

import type { CSSProperties } from "react";
import { targetProgress, type AgentStanding, type TeamStanding } from "@/features/leaderboard/model";
import { agentAvatarSrc, closerAvatarSrc } from "@/features/teams/avatars";
import { TEAM_COLORS } from "@/features/teams/team-colors";
import { Avatar } from "./avatar";
import { Crown } from "./crown";

const wholeNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** "$2,000" for targets; a dash when there's nothing to show. */
function dollars(amount: number | null): string {
  return amount ? `$${wholeNumber.format(amount)}` : "–";
}

/** Achieved amount without a $ sign, as on the original chalkboard. */
function achieved(amount: number): string {
  return amount ? wholeNumber.format(amount) : "–";
}

/** Strips a leading "Team" so "Team Daniel" and "Daniel" both render as TEAM DANIEL. */
function displayTeamName(name: string): string {
  return name.replace(/^team\s+/i, "");
}

const CELL = "border-r border-[var(--team-line)] px-3 py-[0.2em] last:border-r-0";
// Text scales with the screen's height as well as its width, so a full board fits a TV without scrolling.
const ROW_TEXT = "text-[clamp(0.95rem,min(1.35vw,2.1vh),1.6rem)]";

/**
 * One team's chalkboard table. `rowCount` pads the table with empty rows so
 * every panel lines up; the rows share the panel's height evenly.
 */
export function TeamPanel({ team, rowCount }: { team: TeamStanding; rowCount: number }) {
  const { accent, onAccent } = TEAM_COLORS[team.color];
  const style = {
    "--team-accent": accent,
    "--team-on-accent": onAccent,
    "--team-line": `color-mix(in srgb, ${accent} 45%, transparent)`,
  } as CSSProperties;
  const emptyRows = Math.max(rowCount - team.agents.length, 0);

  return (
    <section
      style={style}
      className="flex min-h-0 flex-col border-2 border-[var(--team-accent)] bg-black/60 shadow-[0_0_28px_-6px_var(--team-accent)]"
    >
      <header className="flex items-center gap-4 px-5 py-3">
        <Avatar name={team.closerName} src={closerAvatarSrc(team.name, team.closerAvatarPath)} size={56} />
        <h2 className="flex min-w-0 items-baseline gap-3 font-[family-name:var(--font-marker)] text-[clamp(1.5rem,min(2.3vw,4vh),2.6rem)] uppercase leading-none">
          <span className="text-white">Team</span>
          <span className="truncate text-[var(--team-accent)]">{displayTeamName(team.name)}</span>
        </h2>
        <Crown className="size-9 shrink-0 text-[var(--team-accent)]" />
      </header>

      <table className="h-full w-full flex-1 table-fixed border-collapse">
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[22%]" />
          <col className="w-[20%]" />
          <col className="w-[16%]" />
        </colgroup>
        <thead className="bg-[var(--team-accent)] font-[family-name:var(--font-condensed)] text-[clamp(0.8rem,min(1.05vw,1.8vh),1.15rem)] uppercase tracking-wide text-[var(--team-on-accent)]">
          <tr>
            <th className={`${CELL} py-2 text-left font-medium`}>Agent</th>
            <th className={`${CELL} py-2 text-left font-medium`}>Target</th>
            <th className={`${CELL} py-2 text-center font-medium`}>Ach</th>
            <th className={`${CELL} py-2 text-center font-medium`}>No.S</th>
          </tr>
        </thead>
        <tbody className={`font-[family-name:var(--font-chalk)] text-white ${ROW_TEXT}`}>
          {team.agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} teamName={team.name} />
          ))}
          {Array.from({ length: emptyRows }, (_, index) => (
            <tr key={`empty-${index}`} className="border-t border-[var(--team-line)]">
              {/* Invisible spacer keeps an empty row as tall as a filled one. */}
              <td className={CELL}>
                <span className="block h-[28px]" />
              </td>
              <td className={CELL} />
              <td className={CELL} />
              <td className={CELL} />
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-[var(--team-accent)] font-[family-name:var(--font-condensed)] text-[clamp(0.9rem,min(1.2vw,2vh),1.35rem)] uppercase text-white">
          <tr>
            <td className={`${CELL} font-semibold text-[var(--team-accent)]`}>Team total</td>
            <td className={`${CELL} tabular-nums`}>{dollars(team.target)}</td>
            <td className={`${CELL} text-center font-semibold tabular-nums`}>{achieved(team.salesTotal)}</td>
            <td className={`${CELL} text-center tabular-nums`}>{team.salesCount || "–"}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function AgentRow({ agent, teamName }: { agent: AgentStanding; teamName: string }) {
  const hitTarget = targetProgress(agent.salesTotal, agent.target) === 1;

  return (
    <tr className={`border-t border-[var(--team-line)] ${agent.archived ? "opacity-45" : ""}`}>
      <td className={CELL}>
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={agent.name} src={agentAvatarSrc(teamName, agent.name, agent.avatarPath)} size={28} />
          <span className="truncate uppercase">{agent.name}</span>
          {agent.archived && <span className="shrink-0 text-[0.65em] normal-case text-white/60">(removed)</span>}
        </span>
      </td>
      <td className={`${CELL} tabular-nums`}>{dollars(agent.target)}</td>
      <td
        className={`${CELL} text-center tabular-nums ${hitTarget ? "font-bold text-[var(--team-accent)] [text-shadow:0_0_6px_color-mix(in_srgb,var(--team-accent)_60%,transparent)]" : ""}`}
      >
        {achieved(agent.salesTotal)}
      </td>
      <td className={`${CELL} text-center tabular-nums`}>{agent.salesCount || "–"}</td>
    </tr>
  );
}

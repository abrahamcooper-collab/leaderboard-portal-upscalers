/**
 * The team photos in public/images, used as avatars until per-person avatars
 * are uploaded. A closer's photo is matched by team; an agent's by team and
 * name, so an agent named in the portal as "Joe Bell" gets Team Bill's
 * joe-bell photo (case, spacing and punctuation don't matter).
 *
 * Static imports, so a renamed or missing file fails the build instead of
 * quietly falling back to initials, and Next.js serves resized copies.
 */
import type { StaticImageData } from "next/image";
import { teamKey } from "./team-order";

import billCloser from "../../../public/images/teambill/team-bill-anderson(closer).png";
import billHenry from "../../../public/images/teambill/team-bill-henry.png";
import billJoeBell from "../../../public/images/teambill/team-bill-joe-bell.png";
import billJohnson from "../../../public/images/teambill/johnson.png";
import billKevinWillson from "../../../public/images/teambill/team-bill-kevin-willson.png";
import billPeterLane from "../../../public/images/teambill/team-bill-peter-lane.png";
import billShawnParker from "../../../public/images/teambill/team-bill-shawn-parker.png";
import danielCloser from "../../../public/images/teamdaniel/tean-daniel-daniel-richard(closer).jpeg";
import danielAlexRoberts from "../../../public/images/teamdaniel/team-daniel-alex-roberts.jpeg";
import danielEthanMiller from "../../../public/images/teamdaniel/team-daniel-ethan-miller.jpeg";
import danielPaulWilliams from "../../../public/images/teamdaniel/team-daniel-paul-williams.jpeg";
import danielRichardWilliams from "../../../public/images/teamdaniel/team-danial-richard-williams.jpeg";
import danielRubenHill from "../../../public/images/teamdaniel/team-daniel-ruben-hill.jpeg";
import mikeCloser from "../../../public/images/teammike/team-mike-mike-spector(closer).png";
import mikeBrentWalter from "../../../public/images/teammike/team-mike-brent-walter.jpg";
import mikeEdWillson from "../../../public/images/teammike/team-mike-ed-willson.jpg";
import mikeKaneAnderson from "../../../public/images/teammike/team-mike-kane-anderson.jpg";
import mikeKevinWilliams from "../../../public/images/teammike/team-mike-kevin-williams.jpg";
import mikeSteveJohnson from "../../../public/images/teammike/team-mike-steve-johnson.jpg";

type TeamPhotos = { closer: StaticImageData; agents: Record<string, StaticImageData> };

// Keyed by teamKey(); agent keys are the names as they appear in the portal.
const TEAM_PHOTOS: Record<string, TeamPhotos> = {
  daniel: {
    closer: danielCloser,
    agents: {
      "Richard Williams": danielRichardWilliams,
      "Alex Roberts": danielAlexRoberts,
      "Ethan Miller": danielEthanMiller,
      "Paul Williams": danielPaulWilliams,
      "Ruben Hill": danielRubenHill,
    },
  },
  bill: {
    closer: billCloser,
    agents: {
      Henry: billHenry,
      "Joe Bell": billJoeBell,
      Johnson: billJohnson,
      "Kevin Willson": billKevinWillson,
      "Peter Lane": billPeterLane,
      "Shawn Parker": billShawnParker,
    },
  },
  mike: {
    closer: mikeCloser,
    agents: {
      "Brent Walter": mikeBrentWalter,
      "Ed Willson": mikeEdWillson,
      "Kane Anderson": mikeKaneAnderson,
      "Kevin Williams": mikeKevinWilliams,
      "Steve Johnson": mikeSteveJohnson,
    },
  },
};

const AGENT_PHOTOS = new Map(
  Object.entries(TEAM_PHOTOS).flatMap(([team, { agents }]) =>
    Object.entries(agents).map(([name, photo]) => [photoKey(team, name), photo] as const),
  ),
);

/** The photo of the team's closer, or null for a team without one. */
export function closerPhoto(teamName: string): StaticImageData | null {
  return TEAM_PHOTOS[teamKey(teamName)]?.closer ?? null;
}

/** The photo of the agent with this name in this team, or null when there's none. */
export function agentPhoto(teamName: string, agentName: string): StaticImageData | null {
  return AGENT_PHOTOS.get(photoKey(teamKey(teamName), agentName)) ?? null;
}

function photoKey(team: string, personName: string): string {
  const name = personName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${team}/${name}`;
}

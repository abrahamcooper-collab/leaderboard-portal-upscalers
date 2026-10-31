/**
 * The team photos in public/images, used as avatars until per-person avatars
 * are uploaded. A closer's photo is matched by team. Agents' photos are
 * matched by name within their team, forgivingly, because the file names and
 * the names typed into the portal rarely agree exactly: "Henry Miller" gets
 * the "henry" photo, "Sean Parker" the "shawn-parker" one.
 *
 * Static imports, so a renamed or missing file fails the build instead of
 * quietly falling back to initials, and Next.js serves resized copies.
 */
import type { StaticImageData } from "next/image";
import { teamKey } from "./team-order";

import billCloser from "../../../public/images/teambill/team-bill-anderson(closer).png";
import billHenry from "../../../public/images/teambill/team-bill-henry.png";
import billJoeBell from "../../../public/images/teambill/team-bill-joe-bell.png";
import billJohnsonNikeulei from "../../../public/images/teambill/team-bill-johnson-nikeulei.png";
import billKevinWillson from "../../../public/images/teambill/team-bill-kevin-willson.png";
import billPeterLane from "../../../public/images/teambill/team-bill-peter-lane.png";
import billSeanParker from "../../../public/images/teambill/team-bill-sean-parker.png";
import danielCloser from "../../../public/images/teamdaniel/tean-daniel-daniel-richard(closer).jpeg";
import danielAlexRoberts from "../../../public/images/teamdaniel/team-daniel-alex-roberts.jpeg";
import danielEthanMiller from "../../../public/images/teamdaniel/team-daniel-ethan-miller.jpeg";
import danielPaulWilliams from "../../../public/images/teamdaniel/team-daniel-paul-williams.jpeg";
import danielRichardWilliams from "../../../public/images/teamdaniel/team-danial-richard-williams.jpeg";
import danielRubenHill from "../../../public/images/teamdaniel/team-daniel-ruben-hill.jpeg";
import mikeCloser from "../../../public/images/teammike/team-mike-mike-spector(closer).png";
import mikeBrentWalter from "../../../public/images/teammike/team-mike-brent-walter.jpg";
import mikeEdWillson from "../../../public/images/teammike/team-mike-ed-willson.jpg";
import mikeKaneAnderson from "../../../public/images/teammike/team-mike-kane-anderson.png";
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
      "Johnson Nikeulei": billJohnsonNikeulei,
      "Kevin Willson": billKevinWillson,
      "Peter Lane": billPeterLane,
      "Sean Parker": billSeanParker,
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

export type TeamPhotoMatch = {
  /** Agent name → their photo. Agents without a confident match are left out. */
  byAgent: ReadonlyMap<string, StaticImageData>;
  /** Names on photos that no agent matched, so an admin can see what to fix. */
  unmatched: readonly string[];
};

// A typo allowance: up to one edit per five letters, never more than two.
const LETTERS_PER_ALLOWED_EDIT = 5;
const MAX_EDITS = 2;
// How good a match is (lower is better): exact, then first-name-only, then typos.
const EXACT = 0;
const NAME_PREFIX = 1;

/** The photo of the team's closer, or null for a team without one. */
export function closerPhoto(teamName: string): StaticImageData | null {
  return TEAM_PHOTOS[teamKey(teamName)]?.closer ?? null;
}

/**
 * Matches a team's agents to its photos. Each photo goes to at most one agent,
 * the closest name first; when two candidates are equally close, neither gets
 * it, because a wrong face is worse than initials.
 */
export function matchTeamPhotos(teamName: string, agentNames: readonly string[]): TeamPhotoMatch {
  const photos = new Map(Object.entries(TEAM_PHOTOS[teamKey(teamName)]?.agents ?? {}));
  const candidates = [...new Set(agentNames)].flatMap((agent) =>
    [...photos].flatMap(([photoName, photo]) => {
      const score = nameDistance(normalize(agent), normalize(photoName));
      return score === null ? [] : [{ agent, photoName, photo, score }];
    }),
  );
  candidates.sort((a, b) => a.score - b.score);

  const byAgent = new Map<string, StaticImageData>();
  const decidedAgents = new Set<string>();
  const decidedPhotos = new Set<string>();
  for (const { agent, photoName, photo, score } of candidates) {
    if (decidedAgents.has(agent) || decidedPhotos.has(photoName)) continue;
    const isOpenRival = (other: (typeof candidates)[number]) =>
      other.score === score && !decidedAgents.has(other.agent) && !decidedPhotos.has(other.photoName);

    // Two photos fit this agent equally well: they get initials.
    if (candidates.some((other) => isOpenRival(other) && other.agent === agent && other.photoName !== photoName)) {
      decidedAgents.add(agent);
      continue;
    }
    // Two agents fit this photo equally well: nobody gets it.
    if (candidates.some((other) => isOpenRival(other) && other.photoName === photoName && other.agent !== agent)) {
      decidedPhotos.add(photoName);
      continue;
    }
    byAgent.set(agent, photo);
    decidedAgents.add(agent);
    decidedPhotos.add(photoName);
  }

  const matched = new Set(byAgent.values());
  return { byAgent, unmatched: [...photos].filter(([, photo]) => !matched.has(photo)).map(([name]) => name) };
}

/** Lower is closer; null when the names are too different to be the same person. */
function nameDistance(a: string, b: string): number | null {
  if (a === b) return EXACT;
  // One name is the start of the other on word boundaries: "henry" ↔ "henry miller".
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (longer.startsWith(`${shorter} `)) return NAME_PREFIX;

  const allowed = Math.min(MAX_EDITS, Math.floor(longer.length / LETTERS_PER_ALLOWED_EDIT));
  const edits = editDistance(a, b);
  return edits <= allowed ? NAME_PREFIX + edits : null;
}

/** Levenshtein distance: the fewest single-letter edits that turn `a` into `b`. */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length];
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

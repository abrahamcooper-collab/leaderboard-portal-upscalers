// Left-to-right order of teams on the Sales Floor and the race track.
// Teams not listed go after these, in their existing order.
const TEAM_ORDER = ["daniel", "bill", "mike"];

/** Sorts by TEAM_ORDER; "Team Daniel" and "Daniel" both match "daniel". */
export function sortByTeamOrder<T>(items: readonly T[], nameOf: (item: T) => string): T[] {
  return [...items].sort((a, b) => teamPosition(nameOf(a)) - teamPosition(nameOf(b)));
}

function teamPosition(name: string): number {
  const index = TEAM_ORDER.indexOf(name.replace(/^team\s+/i, "").trim().toLowerCase());
  return index === -1 ? TEAM_ORDER.length : index;
}

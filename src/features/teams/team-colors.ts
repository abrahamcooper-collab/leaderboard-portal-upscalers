/**
 * The colours a team can be shown in on the Sales Floor. Keep the ids in sync
 * with the `teams.color` check constraint in the migrations.
 */
export const TEAM_COLORS = {
  gray: { label: "Gray", accent: "#a1a1aa", onAccent: "#0a0a0a" },
  cyan: { label: "Electric cyan", accent: "#00e5ff", onAccent: "#00181c" },
  gold: { label: "Gold", accent: "#f5c542", onAccent: "#1c1400" },
  red: { label: "Red", accent: "#ef4444", onAccent: "#ffffff" },
  blue: { label: "Blue", accent: "#3b82f6", onAccent: "#ffffff" },
  green: { label: "Green", accent: "#22c55e", onAccent: "#03210e" },
  purple: { label: "Purple", accent: "#a855f7", onAccent: "#ffffff" },
} as const;

export type TeamColor = keyof typeof TEAM_COLORS;

export const TEAM_COLOR_IDS = Object.keys(TEAM_COLORS) as [TeamColor, ...TeamColor[]];

/** Narrows a stored value; anything unknown falls back to gray rather than breaking the board. */
export function toTeamColor(value: string): TeamColor {
  return value in TEAM_COLORS ? (value as TeamColor) : "gray";
}

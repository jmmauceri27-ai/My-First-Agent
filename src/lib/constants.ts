export const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"] as const;
export type Position = (typeof POSITIONS)[number];

export const TAG_OPTIONS = [
  "target",
  "sleeper",
  "breakout",
  "bust",
  "injury-risk",
  "rookie",
  "handcuff",
  "avoid",
  "value",
] as const;

export const NOTE_KINDS = ["note", "trend", "news", "injury"] as const;

export const TIER_COLORS: Record<number, string> = {
  1: "border-l-amber-400",
  2: "border-l-emerald-400",
  3: "border-l-sky-400",
  4: "border-l-violet-400",
  5: "border-l-rose-400",
  6: "border-l-orange-400",
  7: "border-l-teal-400",
  8: "border-l-fuchsia-400",
};

export function tierColor(tier: number | null | undefined): string {
  if (!tier) return "border-l-zinc-300 dark:border-l-zinc-600";
  return TIER_COLORS[((tier - 1) % 8) + 1] ?? "border-l-zinc-300";
}

// Draft Board cell background once a pick is filled, by the player's position.
// Saturated on purpose — this needs to read at a glance during a live draft.
export const POSITION_BG: Record<string, string> = {
  QB: "bg-pink-400 dark:bg-pink-600",
  RB: "bg-orange-400 dark:bg-orange-600",
  WR: "bg-blue-400 dark:bg-blue-600",
  TE: "bg-green-400 dark:bg-green-600",
  DST: "bg-yellow-400 dark:bg-yellow-600",
  K: "bg-purple-400 dark:bg-purple-600",
};

export const TAG_STYLES: Record<string, string> = {
  target: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  sleeper: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  breakout: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  bust: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "injury-risk": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  rookie: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  handcuff: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  avoid: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  value: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
};

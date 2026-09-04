import type { Player } from "@prisma/client";

// Fixed lineup for this league: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX (RB/WR/TE),
// 1 D/ST, 1 K, plus 7 bench spots (16 roster spots total, matching a
// 16-round draft).
export const STARTER_SLOTS = ["QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX", "DST", "K"] as const;
export type StarterSlot = (typeof STARTER_SLOTS)[number];
export const BENCH_SIZE = 7;

const FLEX_ELIGIBLE = new Set(["RB", "WR", "TE"]);

export function buildRoster<T extends Pick<Player, "id" | "position" | "draftRound" | "draftPick">>(
  players: T[]
): { slots: Record<StarterSlot, T | null>; bench: T[] } {
  const sorted = [...players].sort((a, b) => {
    const roundDiff = (a.draftRound ?? Infinity) - (b.draftRound ?? Infinity);
    if (roundDiff !== 0) return roundDiff;
    return (a.draftPick ?? Infinity) - (b.draftPick ?? Infinity);
  });

  const slots: Record<StarterSlot, T | null> = {
    QB: null,
    RB1: null,
    RB2: null,
    WR1: null,
    WR2: null,
    TE: null,
    FLEX: null,
    DST: null,
    K: null,
  };
  const bench: T[] = [];

  for (const p of sorted) {
    if (p.position === "QB" && !slots.QB) slots.QB = p;
    else if (p.position === "RB" && !slots.RB1) slots.RB1 = p;
    else if (p.position === "RB" && !slots.RB2) slots.RB2 = p;
    else if (p.position === "WR" && !slots.WR1) slots.WR1 = p;
    else if (p.position === "WR" && !slots.WR2) slots.WR2 = p;
    else if (p.position === "TE" && !slots.TE) slots.TE = p;
    else if (p.position === "DST" && !slots.DST) slots.DST = p;
    else if (p.position === "K" && !slots.K) slots.K = p;
    else if (FLEX_ELIGIBLE.has(p.position) && !slots.FLEX) slots.FLEX = p;
    else bench.push(p);
  }

  return { slots, bench };
}

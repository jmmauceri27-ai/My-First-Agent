import type { Player } from "@prisma/client";

// Positive = your rank has the player going earlier than ESPN's ADP
// expects (a value pick); negative = ESPN expects them gone before your
// rank says they should be (a reach).
export function adpValue(player: Pick<Player, "overallRank" | "espnAdp">): number | null {
  if (player.overallRank == null || player.espnAdp == null) return null;
  return player.espnAdp - player.overallRank;
}

// Buckets ranks into 10-wide bands (1–10, 11–20, ...) so a value list can
// show representation across the whole board instead of clustering around
// wherever the single biggest gaps happen to be.
export function rankBandStart(rank: number): number {
  return Math.floor((rank - 1) / 10) * 10 + 1;
}

export function groupByRankBand<T extends { player: { overallRank: number | null } }>(
  entries: T[]
): { label: string; start: number; entries: T[] }[] {
  const map = new Map<number, T[]>();
  for (const entry of entries) {
    if (entry.player.overallRank == null) continue;
    const start = rankBandStart(entry.player.overallRank);
    if (!map.has(start)) map.set(start, []);
    map.get(start)!.push(entry);
  }
  return Array.from(map.keys())
    .sort((a, b) => a - b)
    .map((start) => ({ label: `${start}–${start + 9}`, start, entries: map.get(start)! }));
}

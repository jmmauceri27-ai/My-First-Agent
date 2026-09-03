import type { Player } from "@prisma/client";

// Positive = your rank has the player going earlier than ESPN's ADP
// expects (a value pick); negative = ESPN expects them gone before your
// rank says they should be (a reach).
export function adpValue(player: Pick<Player, "overallRank" | "espnAdp">): number | null {
  if (player.overallRank == null || player.espnAdp == null) return null;
  return player.espnAdp - player.overallRank;
}

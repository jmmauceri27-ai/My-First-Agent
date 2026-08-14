// VORP (Value Over Replacement Player): how many more projected points a
// player is worth than the best player you could still get for free at
// that position — i.e. the last player who WOULDN'T be startable across
// the league, given your league settings. FLEX slots aren't counted
// toward any position's startable threshold, so replacement level is
// based only on each position's own dedicated starter slots.

export type VorpSettings = {
  numTeams: number;
  qbSlots: number;
  rbSlots: number;
  wrSlots: number;
  teSlots: number;
  kSlots: number;
  dstSlots: number;
};

const STARTER_SLOTS_KEY: Record<string, keyof VorpSettings> = {
  QB: "qbSlots",
  RB: "rbSlots",
  WR: "wrSlots",
  TE: "teSlots",
  K: "kSlots",
  DST: "dstSlots",
};

export type ProjectedPlayer = { position: string; projectedPoints: number | null };

// Replacement level per position: the projected points of the first player
// NOT startable league-wide (rank = numTeams x starterSlots + 1). If fewer
// players are projected at that position than that depth, falls back to
// the lowest projected player available rather than leaving it undefined —
// the best signal on hand beats no baseline at all.
export function computeReplacementLevels(
  players: ProjectedPlayer[],
  settings: VorpSettings
): Record<string, number | null> {
  const byPosition = new Map<string, number[]>();
  for (const p of players) {
    if (p.projectedPoints == null) continue;
    if (!byPosition.has(p.position)) byPosition.set(p.position, []);
    byPosition.get(p.position)!.push(p.projectedPoints);
  }

  const levels: Record<string, number | null> = {};
  for (const [position, slotsKey] of Object.entries(STARTER_SLOTS_KEY)) {
    const values = (byPosition.get(position) ?? []).sort((a, b) => b - a);
    if (values.length === 0) {
      levels[position] = null;
      continue;
    }
    const starterSlots = settings[slotsKey];
    const replacementRank = settings.numTeams * starterSlots + 1;
    const idx = Math.min(replacementRank - 1, values.length - 1);
    levels[position] = values[idx];
  }
  return levels;
}

export function computeVorp(
  player: { position: string; projectedPoints: number | null },
  replacementLevels: Record<string, number | null>
): number | null {
  if (player.projectedPoints == null) return null;
  const replacement = replacementLevels[player.position];
  if (replacement == null) return null;
  return player.projectedPoints - replacement;
}

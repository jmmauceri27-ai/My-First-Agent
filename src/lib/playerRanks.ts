import { prisma } from "@/lib/prisma";

// positionRank is a derived field, not something you maintain by hand: 1 is
// whichever player at that position has the lowest overallRank, 2 is the
// next, and so on. Unranked players (no overallRank) get a null
// positionRank rather than being tacked onto the end of the list. Call this
// after anything that can change overallRank — bulk CSV import, drag
// reorder, or a single-player edit — so the two never drift apart.
export async function recomputePositionRanks(): Promise<void> {
  const players = await prisma.player.findMany({ select: { id: true, position: true, overallRank: true } });

  const byPosition = new Map<string, typeof players>();
  for (const p of players) {
    if (!byPosition.has(p.position)) byPosition.set(p.position, []);
    byPosition.get(p.position)!.push(p);
  }

  const updates: { id: string; positionRank: number | null }[] = [];
  for (const group of byPosition.values()) {
    const ranked = group
      .filter((p) => p.overallRank != null)
      .sort((a, b) => (a.overallRank as number) - (b.overallRank as number));
    const unranked = group.filter((p) => p.overallRank == null);
    ranked.forEach((p, idx) => updates.push({ id: p.id, positionRank: idx + 1 }));
    unranked.forEach((p) => updates.push({ id: p.id, positionRank: null }));
  }

  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) => prisma.player.update({ where: { id: u.id }, data: { positionRank: u.positionRank } }))
    );
  }
}

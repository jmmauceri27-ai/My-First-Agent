import { prisma } from "@/lib/prisma";

// Single-user app, so this is a singleton row — shared by mock drafts
// (draft order/roster construction) and VORP replacement-level math
// (startable players per position).
export async function getOrCreateLeagueSettings() {
  const existing = await prisma.leagueSettings.findFirst();
  if (existing) return existing;
  return prisma.leagueSettings.create({ data: {} });
}

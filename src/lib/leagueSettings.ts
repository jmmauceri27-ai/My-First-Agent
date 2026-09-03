import { prisma } from "@/lib/prisma";

// Single-user app, so this is a singleton row for mock draft settings
// (draft order/roster construction).
export async function getOrCreateLeagueSettings() {
  const existing = await prisma.leagueSettings.findFirst();
  if (existing) return existing;
  return prisma.leagueSettings.create({ data: {} });
}

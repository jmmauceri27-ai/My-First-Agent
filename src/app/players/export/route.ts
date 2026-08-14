import { prisma } from "@/lib/prisma";
import { toCsvRow } from "@/lib/csv";

// Not under /api/ on purpose — the passcode-gate middleware skips /api/
// routes, and rankings are exactly what that gate exists to protect.
// A plain route handler under a normal page path stays covered by it.
export const dynamic = "force-dynamic";

// positionRank isn't exported — it's derived from overallRank on import, so
// there's nothing to edit and re-upload for it.
const CSV_COLUMNS = [
  "name",
  "position",
  "team",
  "byeWeek",
  "overallRank",
  "adp",
  "projectedPoints",
  "tier",
  "tags",
  "bio",
] as const;

export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: [{ overallRank: "asc" }, { name: "asc" }],
  });

  const lines = [toCsvRow(CSV_COLUMNS)];
  for (const p of players) {
    lines.push(
      toCsvRow([
        p.name,
        p.position,
        p.team,
        p.byeWeek,
        p.overallRank,
        p.adp,
        p.projectedPoints,
        p.tier,
        p.tags.join("|"),
        p.bio,
      ])
    );
  }

  const csv = lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rankings-${date}.csv"`,
    },
  });
}

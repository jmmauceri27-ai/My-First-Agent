import { prisma } from "@/lib/prisma";
import { parseDelimited, splitRow } from "@/lib/csv";

// Matches the file generated from nflverse's season stats export:
// rank,name,position,team,total_ppr_2025,games,ppr_per_game
const CSV_COLUMNS = ["rank", "name", "position", "team", "total_ppr_2025", "games", "ppr_per_game"] as const;

export type ActualStatsImportResult = {
  updated: number;
  notFound: string[];
  errors: string[];
};

export async function importActualStatsFromCsv(raw: string): Promise<ActualStatsImportResult> {
  const result: ActualStatsImportResult = { updated: 0, notFound: [], errors: [] };
  if (!raw.trim()) {
    result.errors.push("No CSV text provided.");
    return result;
  }

  const { columns, dataLines, delimiter } = parseDelimited(raw, CSV_COLUMNS);
  if (dataLines.length === 0) return result;

  // Only updates players already on your board — never creates new rows,
  // since the point is comparing actual results against your existing
  // rankings, not bulk-importing every player who played a snap.
  const existing = await prisma.player.findMany({ select: { id: true, name: true, position: true } });
  const existingMap = new Map(existing.map((p) => [`${p.name.toLowerCase()}|${p.position.toUpperCase()}`, p.id]));

  const updates: { id: string; actualPointsPPR: number; actualGamesPlayed: number | null }[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const cells = splitRow(dataLines[i], delimiter);
    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = cells[idx] ?? "";
    });

    if (!row.name || !row.position) continue;

    const points = parseFloat(row.total_ppr_2025);
    if (Number.isNaN(points)) {
      result.errors.push(`Row ${i + 1}: couldn't parse points for ${row.name} — skipped.`);
      continue;
    }

    const key = `${row.name.toLowerCase()}|${row.position.toUpperCase()}`;
    const id = existingMap.get(key);
    if (!id) {
      result.notFound.push(`${row.name} (${row.position})`);
      continue;
    }

    updates.push({
      id,
      actualPointsPPR: points,
      actualGamesPlayed: row.games ? parseInt(row.games, 10) : null,
    });
  }

  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.player.update({
          where: { id: u.id },
          data: { actualPointsPPR: u.actualPointsPPR, actualGamesPlayed: u.actualGamesPlayed },
        })
      )
    );
    result.updated = updates.length;
  }

  return result;
}

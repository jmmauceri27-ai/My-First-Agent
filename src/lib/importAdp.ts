import { prisma } from "@/lib/prisma";
import { parseDelimited, splitQuotedRow, normalizePlayerName } from "@/lib/csv";

// name,position,espnAdp,sleeperAdp — either ADP column can be left blank if
// you only have one source for that player.
const CSV_COLUMNS = ["name", "position", "espnAdp", "sleeperAdp"] as const;

export type AdpImportResult = {
  updated: number;
  notFound: string[];
  errors: string[];
};

export async function importAdpFromCsv(raw: string): Promise<AdpImportResult> {
  const result: AdpImportResult = { updated: 0, notFound: [], errors: [] };
  if (!raw.trim()) {
    result.errors.push("No CSV text provided.");
    return result;
  }

  const { columns, dataLines, delimiter } = parseDelimited(raw, CSV_COLUMNS);
  if (dataLines.length === 0) return result;

  // Only updates players already on your board — never creates new rows.
  const existing = await prisma.player.findMany({ select: { id: true, name: true, position: true } });
  const existingMap = new Map(
    existing.map((p) => [`${normalizePlayerName(p.name)}|${p.position.toUpperCase()}`, p.id])
  );

  const updates: { id: string; espnAdp: number | null; sleeperAdp: number | null }[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const cells = splitQuotedRow(dataLines[i], delimiter);
    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = cells[idx] ?? "";
    });

    if (!row.name || !row.position) continue;

    const espnAdp = row.espnAdp ? parseFloat(row.espnAdp) : NaN;
    const sleeperAdp = row.sleeperAdp ? parseFloat(row.sleeperAdp) : NaN;
    if (Number.isNaN(espnAdp) && Number.isNaN(sleeperAdp)) {
      result.errors.push(`Row ${i + 1}: no valid ESPN or Sleeper ADP for ${row.name} — skipped.`);
      continue;
    }

    const key = `${normalizePlayerName(row.name)}|${row.position.toUpperCase()}`;
    const id = existingMap.get(key);
    if (!id) {
      result.notFound.push(`${row.name} (${row.position})`);
      continue;
    }

    updates.push({
      id,
      espnAdp: Number.isNaN(espnAdp) ? null : espnAdp,
      sleeperAdp: Number.isNaN(sleeperAdp) ? null : sleeperAdp,
    });
  }

  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.player.update({
          where: { id: u.id },
          data: {
            ...(u.espnAdp != null ? { espnAdp: u.espnAdp } : {}),
            ...(u.sleeperAdp != null ? { sleeperAdp: u.sleeperAdp } : {}),
          },
        })
      )
    );
    result.updated = updates.length;
  }

  return result;
}

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { parseDelimited, splitQuotedRow, normalizePlayerName } from "@/lib/csv";
import { recomputePositionRanks } from "@/lib/playerRanks";

// positionRank isn't a CSV column — it's derived from overallRank after
// every import (see recomputePositionRanks), so you only ever have to
// maintain one ranking, not a second one per position.
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

export type CsvImportResult = { created: number; updated: number; errors: string[] };

export async function importPlayersFromCsv(raw: string): Promise<CsvImportResult> {
  const result: CsvImportResult = { created: 0, updated: 0, errors: [] };
  if (!raw.trim()) {
    result.errors.push("No CSV text provided.");
    return result;
  }

  const { columns, dataLines, delimiter } = parseDelimited(raw, CSV_COLUMNS);
  if (dataLines.length === 0) return result;

  type ParsedRow = Prisma.PlayerCreateManyInput;
  const parsed: ParsedRow[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const cells = splitQuotedRow(line, delimiter);
    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = cells[idx] ?? "";
    });

    if (!row.name || !row.position) {
      result.errors.push(`Row ${i + 1}: missing name or position, skipped.`);
      continue;
    }

    parsed.push({
      name: row.name,
      position: row.position.toUpperCase(),
      team: row.team || null,
      byeWeek: row.byeWeek ? parseInt(row.byeWeek, 10) : null,
      overallRank: row.overallRank ? parseInt(row.overallRank, 10) : null,
      adp: row.adp ? parseFloat(row.adp) : null,
      projectedPoints: row.projectedPoints ? parseFloat(row.projectedPoints) : null,
      tier: row.tier ? parseInt(row.tier, 10) : null,
      tags: row.tags ? row.tags.split("|").map((t) => t.trim()).filter(Boolean) : [],
      bio: row.bio || null,
    });
  }

  // Batch: one query to find existing matches, one bulk insert for new rows,
  // and only fall back to per-row updates for players that already exist.
  const existing = await prisma.player.findMany({ select: { id: true, name: true, position: true } });
  const existingMap = new Map(existing.map((p) => [`${normalizePlayerName(p.name)}|${p.position}`, p.id]));

  const toCreate: ParsedRow[] = [];
  const toUpdate: { id: string; data: ParsedRow }[] = [];

  for (const row of parsed) {
    const key = `${normalizePlayerName(row.name)}|${row.position}`;
    const existingId = existingMap.get(key);
    if (existingId) {
      toUpdate.push({ id: existingId, data: row });
    } else {
      toCreate.push(row);
    }
  }

  if (toCreate.length > 0) {
    await prisma.player.createMany({ data: toCreate });
    result.created = toCreate.length;
  }

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((u) => prisma.player.update({ where: { id: u.id }, data: u.data }))
    );
    result.updated = toUpdate.length;
  }

  if (toCreate.length > 0 || toUpdate.length > 0) {
    await recomputePositionRanks();
  }

  return result;
}

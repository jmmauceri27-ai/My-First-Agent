import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { parseDelimited, splitRow } from "@/lib/csv";

const CSV_COLUMNS = ["round", "pickInRound", "manager", "playerName", "position", "nflTeam"] as const;

export type CsvImportResult = { created: number; updated: number; errors: string[] };

export async function importPicksFromCsv(seasonId: string, raw: string): Promise<CsvImportResult> {
  const result: CsvImportResult = { created: 0, updated: 0, errors: [] };
  if (!raw.trim()) {
    result.errors.push("No CSV text provided.");
    return result;
  }

  const { columns, dataLines, delimiter } = parseDelimited(raw, CSV_COLUMNS);
  if (dataLines.length === 0) return result;

  type ParsedPick = {
    round: number;
    pickInRound: number;
    manager: string;
    playerName: string;
    position: string;
    nflTeam: string | null;
  };
  const parsed: ParsedPick[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const cells = splitRow(line, delimiter);
    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = cells[idx] ?? "";
    });

    const round = parseInt(row.round, 10);
    const pickInRound = parseInt(row.pickInRound, 10);

    if (!row.manager || !row.playerName || !row.position || Number.isNaN(round) || Number.isNaN(pickInRound)) {
      result.errors.push(`Row ${i + 1}: missing round, pickInRound, manager, playerName, or position — skipped.`);
      continue;
    }

    parsed.push({
      round,
      pickInRound,
      manager: row.manager,
      playerName: row.playerName,
      position: row.position.toUpperCase(),
      nflTeam: row.nflTeam || null,
    });
  }

  const existing = await prisma.draftHistoryPick.findMany({
    where: { seasonId },
    select: { id: true, round: true, pickInRound: true },
  });
  const existingMap = new Map(existing.map((p) => [`${p.round}|${p.pickInRound}`, p.id]));

  const toCreate: Prisma.DraftHistoryPickCreateManyInput[] = [];
  const toUpdate: { id: string; data: Omit<Prisma.DraftHistoryPickCreateManyInput, "seasonId"> }[] = [];

  for (const pick of parsed) {
    const key = `${pick.round}|${pick.pickInRound}`;
    const existingId = existingMap.get(key);
    if (existingId) {
      toUpdate.push({ id: existingId, data: pick });
    } else {
      toCreate.push({ ...pick, seasonId });
    }
  }

  if (toCreate.length > 0) {
    await prisma.draftHistoryPick.createMany({ data: toCreate });
    result.created = toCreate.length;
  }

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((u) => prisma.draftHistoryPick.update({ where: { id: u.id }, data: u.data }))
    );
    result.updated = toUpdate.length;
  }

  return result;
}

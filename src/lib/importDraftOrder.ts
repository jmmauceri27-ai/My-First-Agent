import { prisma } from "@/lib/prisma";
import { parseDelimited, splitQuotedRow } from "@/lib/csv";

// overallPick,round,pickInRound,manager — one row per physical pick in
// your real draft (e.g. 192 rows for 12 teams x 16 rounds), covering
// however trades actually shuffled ownership.
const CSV_COLUMNS = ["overallPick", "round", "pickInRound", "manager"] as const;

export type DraftOrderImportResult = { updated: number; errors: string[] };

export async function importDraftOrderFromCsv(raw: string): Promise<DraftOrderImportResult> {
  const result: DraftOrderImportResult = { updated: 0, errors: [] };
  if (!raw.trim()) {
    result.errors.push("No CSV text provided.");
    return result;
  }

  const { columns, dataLines, delimiter } = parseDelimited(raw, CSV_COLUMNS);
  if (dataLines.length === 0) return result;

  const rows: { overallPick: number; round: number; pickInRound: number; managerName: string }[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const cells = splitQuotedRow(dataLines[i], delimiter);
    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = cells[idx] ?? "";
    });

    const overallPick = parseInt(row.overallPick, 10);
    const round = parseInt(row.round, 10);
    const pickInRound = parseInt(row.pickInRound, 10);
    if (Number.isNaN(overallPick) || Number.isNaN(round) || Number.isNaN(pickInRound) || !row.manager) {
      result.errors.push(`Row ${i + 1}: missing or invalid pick data — skipped.`);
      continue;
    }

    rows.push({ overallPick, round, pickInRound, managerName: row.manager });
  }

  if (rows.length > 0) {
    await prisma.$transaction(
      rows.map((r) =>
        prisma.draftOrderPick.upsert({
          where: { overallPick: r.overallPick },
          create: r,
          update: { round: r.round, pickInRound: r.pickInRound, managerName: r.managerName },
        })
      )
    );
    result.updated = rows.length;
  }

  return result;
}

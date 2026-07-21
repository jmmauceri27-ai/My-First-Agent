import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { parseDelimited, splitQuotedRow, splitRow, detectDelimiter } from "@/lib/csv";

const CSV_COLUMNS = ["round", "pickInRound", "manager", "playerName", "position", "nflTeam"] as const;

export type CsvImportResult = { created: number; updated: number; errors: string[] };

type ParsedPick = {
  round: number;
  pickInRound: number;
  manager: string;
  playerName: string;
  position: string;
  nflTeam: string | null;
};

function normalizePosition(pos: string): string {
  const upper = pos.trim().toUpperCase();
  if (upper === "D/ST" || upper === "DEF" || upper === "DST") return "DST";
  return upper;
}

// Some league sites export draft results as repeating per-round blocks:
//   Round 1,,
//   NO.,Player,Team
//   1,"Bijan Robinson Atl, RB",CJ
//   2,"Ja'Marr Chase Cin, WR",Billy
//   ...
//   Round 2,,
//   ...
// Here "Team" is actually the manager, and the player cell packs
// name + NFL team + position into one quoted field.
function looksLikeRoundBlockFormat(raw: string): boolean {
  return /^round\s+\d+/im.test(raw) || /^no\.?\s*,\s*player\s*,\s*team/im.test(raw);
}

function parseRoundBlockCsv(raw: string): { picks: ParsedPick[]; errors: string[] } {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "" && l !== ",," && l !== ",");

  const picks: ParsedPick[] = [];
  const errors: string[] = [];
  let currentRound = 0;

  for (const line of lines) {
    const roundMatch = line.match(/^round\s+(\d+)/i);
    if (roundMatch) {
      currentRound = parseInt(roundMatch[1], 10);
      continue;
    }
    if (/^no\.?\s*,/i.test(line)) continue; // "NO.,Player,Team" sub-header

    const delimiter = detectDelimiter(line);
    const cells = splitQuotedRow(line, delimiter);
    const pickInRound = parseInt(cells[0] ?? "", 10);
    const playerCell = cells[1] ?? "";
    const manager = cells[2] ?? "";

    if (!currentRound || Number.isNaN(pickInRound) || !playerCell || !manager) continue;

    const commaIdx = playerCell.lastIndexOf(",");
    if (commaIdx === -1) {
      errors.push(`Round ${currentRound}, pick ${pickInRound}: couldn't parse "${playerCell}" — skipped.`);
      continue;
    }

    const namePart = playerCell.slice(0, commaIdx).trim();
    const position = normalizePosition(playerCell.slice(commaIdx + 1));
    const nameTokens = namePart.split(/\s+/);
    const nflTeam = (nameTokens.pop() ?? "").toUpperCase() || null;
    const playerName = nameTokens.join(" ");

    if (!playerName || !position) {
      errors.push(`Round ${currentRound}, pick ${pickInRound}: couldn't parse "${playerCell}" — skipped.`);
      continue;
    }

    picks.push({ round: currentRound, pickInRound, manager, playerName, position, nflTeam });
  }

  return { picks, errors };
}

function parseFlatCsv(raw: string): { picks: ParsedPick[]; errors: string[] } {
  const { columns, dataLines, delimiter } = parseDelimited(raw, CSV_COLUMNS);
  const picks: ParsedPick[] = [];
  const errors: string[] = [];

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
      errors.push(`Row ${i + 1}: missing round, pickInRound, manager, playerName, or position — skipped.`);
      continue;
    }

    picks.push({
      round,
      pickInRound,
      manager: row.manager,
      playerName: row.playerName,
      position: normalizePosition(row.position),
      nflTeam: row.nflTeam || null,
    });
  }

  return { picks, errors };
}

export async function importPicksFromCsv(seasonId: string, raw: string): Promise<CsvImportResult> {
  const result: CsvImportResult = { created: 0, updated: 0, errors: [] };
  if (!raw.trim()) {
    result.errors.push("No CSV text provided.");
    return result;
  }

  const { picks: parsed, errors } = looksLikeRoundBlockFormat(raw) ? parseRoundBlockCsv(raw) : parseFlatCsv(raw);
  result.errors = errors;
  if (parsed.length === 0) return result;

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

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { parseDelimited, splitRow, normalizePlayerName } from "@/lib/csv";

const CSV_COLUMNS = [
  "season",
  "week",
  "name",
  "position",
  "team",
  "opponent",
  "passYards",
  "passTDs",
  "passInt",
  "rushYards",
  "rushTDs",
  "receptions",
  "recYards",
  "recTDs",
  "pointsPPR",
] as const;

export type GameLogImportResult = {
  created: number;
  updated: number;
  skippedPlayers: number;
  errors: string[];
};

function optInt(v: string): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

export async function importGameLogsFromCsv(raw: string): Promise<GameLogImportResult> {
  const result: GameLogImportResult = { created: 0, updated: 0, skippedPlayers: 0, errors: [] };
  if (!raw.trim()) {
    result.errors.push("No CSV text provided.");
    return result;
  }

  const { columns, dataLines, delimiter } = parseDelimited(raw, CSV_COLUMNS);
  if (dataLines.length === 0) return result;

  // Only logs games for players already on your board — same reasoning as
  // the actual-stats importer: this is for drilling into players you're
  // tracking, not bulk-loading every player in the league.
  const existing = await prisma.player.findMany({ select: { id: true, name: true, position: true } });
  const existingMap = new Map(
    existing.map((p) => [`${normalizePlayerName(p.name)}|${p.position.toUpperCase()}`, p.id])
  );
  const unmatchedPlayers = new Set<string>();

  type ParsedLog = Omit<Prisma.GameLogCreateManyInput, "playerId"> & { playerId: string };
  const parsed: ParsedLog[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const cells = splitRow(dataLines[i], delimiter);
    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = cells[idx] ?? "";
    });

    if (!row.name || !row.position || !row.season || !row.week) continue;

    const key = `${normalizePlayerName(row.name)}|${row.position.toUpperCase()}`;
    const playerId = existingMap.get(key);
    if (!playerId) {
      unmatchedPlayers.add(`${row.name} (${row.position})`);
      continue;
    }

    const pointsPPR = parseFloat(row.pointsPPR);
    if (Number.isNaN(pointsPPR)) {
      result.errors.push(`Row ${i + 1}: couldn't parse points for ${row.name} week ${row.week} — skipped.`);
      continue;
    }

    parsed.push({
      playerId,
      season: parseInt(row.season, 10),
      week: parseInt(row.week, 10),
      team: row.team || null,
      opponent: row.opponent || null,
      passYards: optInt(row.passYards),
      passTDs: optInt(row.passTDs),
      passInt: optInt(row.passInt),
      rushYards: optInt(row.rushYards),
      rushTDs: optInt(row.rushTDs),
      receptions: optInt(row.receptions),
      recYards: optInt(row.recYards),
      recTDs: optInt(row.recTDs),
      pointsPPR,
    });
  }

  result.skippedPlayers = unmatchedPlayers.size;

  const existingLogs = await prisma.gameLog.findMany({ select: { id: true, playerId: true, season: true, week: true } });
  const existingLogMap = new Map(existingLogs.map((g) => [`${g.playerId}|${g.season}|${g.week}`, g.id]));

  const toCreate: Prisma.GameLogCreateManyInput[] = [];
  const toUpdate: { id: string; data: Omit<Prisma.GameLogCreateManyInput, "playerId"> }[] = [];

  for (const log of parsed) {
    const key = `${log.playerId}|${log.season}|${log.week}`;
    const existingId = existingLogMap.get(key);
    if (existingId) {
      toUpdate.push({ id: existingId, data: log });
    } else {
      toCreate.push(log);
    }
  }

  if (toCreate.length > 0) {
    await prisma.gameLog.createMany({ data: toCreate });
    result.created = toCreate.length;
  }

  if (toUpdate.length > 0) {
    await prisma.$transaction(toUpdate.map((u) => prisma.gameLog.update({ where: { id: u.id }, data: u.data })));
    result.updated = toUpdate.length;
  }

  return result;
}

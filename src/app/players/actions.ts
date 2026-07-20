"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function optInt(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

function optFloat(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = parseFloat(String(value));
  return Number.isNaN(n) ? null : n;
}

function optStr(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export async function savePlayer(formData: FormData): Promise<void> {
  const id = optStr(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  if (!name || !position) {
    throw new Error("Name and position are required.");
  }

  const data = {
    name,
    position,
    team: optStr(formData.get("team")),
    byeWeek: optInt(formData.get("byeWeek")),
    overallRank: optInt(formData.get("overallRank")),
    positionRank: optInt(formData.get("positionRank")),
    adp: optFloat(formData.get("adp")),
    tier: optInt(formData.get("tier")),
    tags: formData.getAll("tags").map(String),
    bio: optStr(formData.get("bio")),
    watchlisted: formData.get("watchlisted") === "on",
  };

  if (id) {
    await prisma.player.update({ where: { id }, data });
  } else {
    await prisma.player.create({ data });
  }

  revalidatePath("/players");
  revalidatePath("/board");
  revalidatePath("/draft");
  revalidatePath("/");
  if (id) revalidatePath(`/players/${id}`);
}

export async function deletePlayer(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await prisma.player.delete({ where: { id } });
  revalidatePath("/players");
  revalidatePath("/board");
  revalidatePath("/draft");
  revalidatePath("/");
}

export async function toggleWatchlist(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const next = formData.get("next") === "true";
  await prisma.player.update({ where: { id }, data: { watchlisted: next } });
  revalidatePath("/players");
  revalidatePath("/");
}

export async function addNote(formData: FormData): Promise<void> {
  const playerId = String(formData.get("playerId"));
  const body = String(formData.get("body") ?? "").trim();
  const kind = String(formData.get("kind") ?? "note");
  if (!body) return;
  await prisma.note.create({ data: { playerId, body, kind } });
  revalidatePath(`/players/${playerId}`);
  revalidatePath("/");
}

export async function deleteNote(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const playerId = String(formData.get("playerId"));
  await prisma.note.delete({ where: { id } });
  revalidatePath(`/players/${playerId}`);
  revalidatePath("/");
}

const CSV_COLUMNS = [
  "name",
  "position",
  "team",
  "byeWeek",
  "overallRank",
  "positionRank",
  "adp",
  "tier",
  "tags",
  "bio",
] as const;

export type CsvImportResult = { created: number; updated: number; errors: string[] };

export async function importCsv(formData: FormData): Promise<CsvImportResult> {
  const raw = String(formData.get("csv") ?? "").trim();
  const result: CsvImportResult = { created: 0, updated: 0, errors: [] };
  if (!raw) {
    result.errors.push("No CSV text provided.");
    return result;
  }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return result;

  // Auto-detect delimiter: pasting from a spreadsheet app (Excel/Sheets/Numbers)
  // copies cells as tab-separated, not comma-separated.
  const tabCount = (lines[0].match(/\t/g) ?? []).length;
  const commaCount = (lines[0].match(/,/g) ?? []).length;
  const delimiter = tabCount > commaCount ? "\t" : ",";

  const header = lines[0].split(delimiter).map((h) => h.trim());
  const dataLines = /^name$/i.test(header[0]) ? lines.slice(1) : lines;
  const columns = /^name$/i.test(header[0]) ? header : CSV_COLUMNS.slice(0, header.length);

  type ParsedRow = Prisma.PlayerCreateManyInput;
  const parsed: ParsedRow[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const cells = line.split(delimiter).map((c) => c.trim());
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
      positionRank: row.positionRank ? parseInt(row.positionRank, 10) : null,
      adp: row.adp ? parseFloat(row.adp) : null,
      tier: row.tier ? parseInt(row.tier, 10) : null,
      tags: row.tags ? row.tags.split("|").map((t) => t.trim()).filter(Boolean) : [],
      bio: row.bio || null,
    });
  }

  // Batch: one query to find existing matches, one bulk insert for new rows,
  // and only fall back to per-row updates for players that already exist.
  const existing = await prisma.player.findMany({ select: { id: true, name: true, position: true } });
  const existingMap = new Map(existing.map((p) => [`${p.name.toLowerCase()}|${p.position}`, p.id]));

  const toCreate: ParsedRow[] = [];
  const toUpdate: { id: string; data: ParsedRow }[] = [];

  for (const row of parsed) {
    const key = `${row.name.toLowerCase()}|${row.position}`;
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

  revalidatePath("/players");
  revalidatePath("/board");
  revalidatePath("/draft");
  revalidatePath("/");
  return result;
}

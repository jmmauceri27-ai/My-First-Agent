"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { importPlayersFromCsv, type CsvImportResult } from "@/lib/importPlayers";
import { importActualStatsFromCsv, type ActualStatsImportResult } from "@/lib/importActualStats";
import { importGameLogsFromCsv, type GameLogImportResult } from "@/lib/importGameLogs";

export type { CsvImportResult, ActualStatsImportResult, GameLogImportResult };

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

// Persists a full drag-and-drop reorder of the rankings: `orderedIds` is
// every player's id in their new top-to-bottom order, and each gets
// overallRank = its position in that list (1-indexed).
export async function reorderPlayers(orderedIds: string[]): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, idx) => prisma.player.update({ where: { id }, data: { overallRank: idx + 1 } }))
  );
  revalidatePath("/players");
  revalidatePath("/board");
  revalidatePath("/draft");
  revalidatePath("/");
  revalidatePath("/players/[id]", "page");
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

export async function importCsv(formData: FormData): Promise<CsvImportResult> {
  const file = formData.get("file");
  const raw = file instanceof File && file.size > 0 ? await file.text() : String(formData.get("csv") ?? "");
  const result = await importPlayersFromCsv(raw);

  revalidatePath("/players");
  revalidatePath("/board");
  revalidatePath("/draft");
  revalidatePath("/");
  return result;
}

export async function importActualStats(formData: FormData): Promise<ActualStatsImportResult> {
  const file = formData.get("file");
  const raw = file instanceof File && file.size > 0 ? await file.text() : String(formData.get("csv") ?? "");
  const result = await importActualStatsFromCsv(raw);

  revalidatePath("/players");
  revalidatePath("/board");
  revalidatePath("/");
  revalidatePath("/players/[id]", "page");
  return result;
}

export async function importGameLogs(formData: FormData): Promise<GameLogImportResult> {
  const file = formData.get("file");
  const raw = file instanceof File && file.size > 0 ? await file.text() : String(formData.get("csv") ?? "");
  const result = await importGameLogsFromCsv(raw);

  revalidatePath("/players");
  revalidatePath("/players/[id]", "page");
  return result;
}

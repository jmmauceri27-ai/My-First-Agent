"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { importPlayersFromCsv, type CsvImportResult } from "@/lib/importPlayers";

export type { CsvImportResult };

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

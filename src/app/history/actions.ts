"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { importPicksFromCsv, type CsvImportResult } from "@/lib/draftHistory";

export type { CsvImportResult };

function optInt(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

function optStr(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export async function createSeason(formData: FormData): Promise<void> {
  const year = parseInt(String(formData.get("year") ?? ""), 10);
  if (Number.isNaN(year)) {
    throw new Error("Year is required.");
  }
  const season = await prisma.draftSeason.create({
    data: {
      year,
      name: optStr(formData.get("name")),
      numTeams: optInt(formData.get("numTeams")),
    },
  });

  revalidatePath("/history");
  redirect(`/history/${season.id}`);
}

export async function deleteSeason(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await prisma.draftSeason.delete({ where: { id } });
  revalidatePath("/history");
}

export async function addPick(formData: FormData): Promise<void> {
  const seasonId = String(formData.get("seasonId"));
  const round = parseInt(String(formData.get("round") ?? ""), 10);
  const pickInRound = parseInt(String(formData.get("pickInRound") ?? ""), 10);
  const manager = String(formData.get("manager") ?? "").trim();
  const playerName = String(formData.get("playerName") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim().toUpperCase();

  if (Number.isNaN(round) || Number.isNaN(pickInRound) || !manager || !playerName || !position) {
    throw new Error("Round, pick, manager, player name, and position are required.");
  }

  await prisma.draftHistoryPick.upsert({
    where: { seasonId_round_pickInRound: { seasonId, round, pickInRound } },
    create: {
      seasonId,
      round,
      pickInRound,
      manager,
      playerName,
      position,
      nflTeam: optStr(formData.get("nflTeam")),
    },
    update: {
      manager,
      playerName,
      position,
      nflTeam: optStr(formData.get("nflTeam")),
    },
  });

  revalidatePath(`/history/${seasonId}`);
  revalidatePath("/history");
}

export async function deletePick(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const seasonId = String(formData.get("seasonId"));
  await prisma.draftHistoryPick.delete({ where: { id } });
  revalidatePath(`/history/${seasonId}`);
  revalidatePath("/history");
}

export async function importSeasonCsv(formData: FormData): Promise<CsvImportResult> {
  const seasonId = String(formData.get("seasonId"));
  const file = formData.get("file");
  const raw = file instanceof File && file.size > 0 ? await file.text() : String(formData.get("csv") ?? "");
  const result = await importPicksFromCsv(seasonId, raw);

  revalidatePath(`/history/${seasonId}`);
  revalidatePath("/history");
  return result;
}

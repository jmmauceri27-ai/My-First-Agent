"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { importDraftOrderFromCsv, type DraftOrderImportResult } from "@/lib/importDraftOrder";

export type { DraftOrderImportResult };

export async function markDrafted(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const draftedBy = String(formData.get("draftedBy") ?? "").trim() || "Me";
  const round = formData.get("draftRound") ? parseInt(String(formData.get("draftRound")), 10) : null;
  const pick = formData.get("draftPick") ? parseInt(String(formData.get("draftPick")), 10) : null;

  await prisma.player.update({
    where: { id },
    data: { draftedBy, draftRound: round, draftPick: pick, draftedAt: new Date() },
  });

  revalidatePath("/draft");
  revalidatePath("/players");
  revalidatePath("/board");
  revalidatePath("/");
}

export async function undoDraft(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await prisma.player.update({
    where: { id },
    data: { draftedBy: null, draftRound: null, draftPick: null, draftedAt: null },
  });
  revalidatePath("/draft");
  revalidatePath("/players");
  revalidatePath("/board");
  revalidatePath("/");
}

export async function resetDraft(): Promise<void> {
  await prisma.player.updateMany({
    data: { draftedBy: null, draftRound: null, draftPick: null, draftedAt: null },
  });
  revalidatePath("/draft");
  revalidatePath("/players");
  revalidatePath("/board");
  revalidatePath("/");
}

export async function importDraftOrder(formData: FormData): Promise<DraftOrderImportResult> {
  const file = formData.get("file");
  const raw = file instanceof File && file.size > 0 ? await file.text() : String(formData.get("csv") ?? "");
  const result = await importDraftOrderFromCsv(raw);
  revalidatePath("/draft");
  return result;
}

export async function clearDraftOrder(): Promise<void> {
  await prisma.draftOrderPick.deleteMany();
  revalidatePath("/draft");
}

export async function updateDraftOrderPickManager(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const managerName = String(formData.get("managerName") ?? "").trim();
  if (!managerName) return;

  await prisma.draftOrderPick.update({
    where: { id },
    data: { managerName },
  });
  revalidatePath("/draft");
}

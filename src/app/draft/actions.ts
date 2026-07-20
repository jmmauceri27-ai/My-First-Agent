"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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

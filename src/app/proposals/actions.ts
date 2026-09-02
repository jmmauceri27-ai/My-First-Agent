"use server";

import { revalidatePath } from "next/cache";
import {
  bulkCreateRateItems,
  createClientRateOverride,
  createRateItem,
  deleteClientRateOverride,
  deleteRateItem,
  updateClientRateOverride,
  updateRateItem,
} from "@/lib/crmDal";
import type { ClientRateOverrideInput, RateItemImportRow, RateItemInput } from "@/lib/crmTypes";

export async function saveRateItemAction(id: string | null, input: RateItemInput): Promise<string> {
  let itemId: string;
  if (id) {
    await updateRateItem(id, input);
    itemId = id;
  } else {
    itemId = await createRateItem(input);
  }
  revalidatePath("/proposals");
  return itemId;
}

export async function deleteRateItemAction(id: string): Promise<void> {
  await deleteRateItem(id);
  revalidatePath("/proposals");
}

export async function bulkCreateRateItemsAction(
  rows: RateItemImportRow[],
): Promise<{ inserted?: number; error?: string }> {
  try {
    const result = await bulkCreateRateItems(rows);
    revalidatePath("/proposals");
    return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to import rate items." };
  }
}

export async function saveClientRateOverrideAction(id: string | null, input: ClientRateOverrideInput): Promise<string> {
  let overrideId: string;
  if (id) {
    await updateClientRateOverride(id, input);
    overrideId = id;
  } else {
    overrideId = await createClientRateOverride(input);
  }
  revalidatePath("/proposals");
  return overrideId;
}

export async function deleteClientRateOverrideAction(id: string): Promise<void> {
  await deleteClientRateOverride(id);
  revalidatePath("/proposals");
}

"use server";

import { getDatasetRows, getTemplateBinding, saveTemplateBinding } from "@/lib/dal";
import type { DatasetRecord } from "@/lib/types";

export async function fetchDatasetRowsAction(datasetId: string): Promise<DatasetRecord[]> {
  return getDatasetRows(datasetId);
}

export async function getTemplateBindingAction(
  templateKey: string,
  datasetId: string,
): Promise<Record<string, string> | null> {
  return getTemplateBinding(templateKey, datasetId);
}

export async function saveTemplateBindingAction(
  templateKey: string,
  datasetId: string,
  roleMapping: Record<string, string>,
): Promise<void> {
  await saveTemplateBinding(templateKey, datasetId, roleMapping);
}

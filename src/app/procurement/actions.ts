"use server";

import { getDatasetRows, getSiteMapBinding, saveSiteMapBinding } from "@/lib/dal";
import type { DatasetRecord, SiteMapBinding } from "@/lib/types";

export async function fetchDatasetRowsAction(datasetId: string): Promise<DatasetRecord[]> {
  return getDatasetRows(datasetId);
}

export async function getSiteMapBindingAction(datasetId: string): Promise<SiteMapBinding | null> {
  return getSiteMapBinding(datasetId);
}

export async function saveSiteMapBindingAction(datasetId: string, binding: SiteMapBinding): Promise<void> {
  await saveSiteMapBinding(datasetId, binding);
}

"use server";

import {
  getDatasetRowsWithIds,
  getSiteMapBinding,
  saveSiteMapBinding,
  updateDatasetRowFields,
} from "@/lib/dal";
import type { DatasetRecord, DatasetRowWithId, SiteMapBinding } from "@/lib/types";

export async function fetchDatasetRowsWithIdsAction(datasetId: string): Promise<DatasetRowWithId[]> {
  return getDatasetRowsWithIds(datasetId);
}

export async function getSiteMapBindingAction(datasetId: string): Promise<SiteMapBinding | null> {
  return getSiteMapBinding(datasetId);
}

export async function saveSiteMapBindingAction(datasetId: string, binding: SiteMapBinding): Promise<void> {
  await saveSiteMapBinding(datasetId, binding);
}

export async function updateSiteRowAction(datasetId: string, rowId: number, data: DatasetRecord): Promise<void> {
  await updateDatasetRowFields(datasetId, rowId, data);
}

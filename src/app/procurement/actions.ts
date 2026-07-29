"use server";

import {
  deleteSiteMapView,
  getDatasetRowsWithIds,
  getSiteMapBinding,
  listSiteMapViews,
  saveSiteMapBinding,
  saveSiteMapView,
  updateDatasetRowFields,
} from "@/lib/dal";
import type { DatasetRecord, DatasetRowWithId, SiteMapBinding, SiteMapView } from "@/lib/types";

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

export async function listSiteMapViewsAction(datasetId: string): Promise<SiteMapView[]> {
  return listSiteMapViews(datasetId);
}

export async function saveSiteMapViewAction(
  datasetId: string,
  view: { name: string; colorColumn: string; colorMode: SiteMapView["colorMode"] },
): Promise<string> {
  return saveSiteMapView(datasetId, view);
}

export async function deleteSiteMapViewAction(viewId: string): Promise<void> {
  await deleteSiteMapView(viewId);
}

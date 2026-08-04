"use server";

import {
  deleteSiteMapView,
  deleteVendorMapView,
  getDatasetRowsWithIds,
  getSiteMapBinding,
  getVendorMapBinding,
  listSiteMapViews,
  listVendorMapViews,
  saveSiteMapBinding,
  saveSiteMapView,
  saveVendorMapBinding,
  saveVendorMapView,
  updateDatasetRowFields,
} from "@/lib/dal";
import type {
  DatasetRecord,
  DatasetRowWithId,
  SiteMapBinding,
  SiteMapView,
  VendorMapBinding,
  VendorMapView,
} from "@/lib/types";

/** Dataset-agnostic: used by both the Site Map and the Vendor Prospecting Network. */
export async function fetchDatasetRowsWithIdsAction(datasetId: string): Promise<DatasetRowWithId[]> {
  return getDatasetRowsWithIds(datasetId);
}

/** Dataset-agnostic row update: used by both maps' click-to-edit panel. */
export async function updateSiteRowAction(datasetId: string, rowId: number, data: DatasetRecord): Promise<void> {
  await updateDatasetRowFields(datasetId, rowId, data);
}

export async function getSiteMapBindingAction(datasetId: string): Promise<SiteMapBinding | null> {
  return getSiteMapBinding(datasetId);
}

export async function saveSiteMapBindingAction(datasetId: string, binding: SiteMapBinding): Promise<void> {
  await saveSiteMapBinding(datasetId, binding);
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

export async function getVendorMapBindingAction(datasetId: string): Promise<VendorMapBinding | null> {
  return getVendorMapBinding(datasetId);
}

export async function saveVendorMapBindingAction(datasetId: string, binding: VendorMapBinding): Promise<void> {
  await saveVendorMapBinding(datasetId, binding);
}

export async function listVendorMapViewsAction(datasetId: string): Promise<VendorMapView[]> {
  return listVendorMapViews(datasetId);
}

export async function saveVendorMapViewAction(
  datasetId: string,
  view: { name: string; colorColumn: string; colorMode: VendorMapView["colorMode"] },
): Promise<string> {
  return saveVendorMapView(datasetId, view);
}

export async function deleteVendorMapViewAction(viewId: string): Promise<void> {
  await deleteVendorMapView(viewId);
}

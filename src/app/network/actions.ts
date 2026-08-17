"use server";

import { revalidatePath } from "next/cache";
import { buildXlsxBase64 } from "@/lib/exportExcel";
import { parseBuffer } from "@/lib/parse";
import type { DatasetRecord } from "@/lib/types";
import {
  bulkAssignTrades,
  bulkCreateSites,
  bulkCreateSitesForOpportunity,
  bulkCreateVendors,
  bulkUpdateSites,
  createSite,
  createVendor,
  deleteSite,
  deleteVendor,
  getSite,
  getVendor,
  listSites,
  listSitesForCompany,
  listSitesForOpportunity,
  listSitesForVendor,
  listVendors,
  updateSite,
  updateVendor,
} from "@/lib/networkDal";
import type {
  Site,
  SiteBulkLinks,
  SiteImportRow,
  SiteInput,
  SiteUpdateResult,
  SiteUpdateRow,
  Vendor,
  VendorImportRow,
  VendorInput,
} from "@/lib/networkTypes";

// ---------- Vendors ----------

export async function listVendorsAction(): Promise<Vendor[]> {
  return listVendors();
}

export async function getVendorAction(id: string): Promise<Vendor | null> {
  return getVendor(id);
}

export async function saveVendorAction(id: string | null, input: VendorInput): Promise<{ id?: string; error?: string }> {
  try {
    if (id) {
      await updateVendor(id, input);
      revalidatePath("/network");
      revalidatePath(`/network/vendors/${id}`);
      return { id };
    }
    const newId = await createVendor(input);
    revalidatePath("/network");
    return { id: newId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save vendor." };
  }
}

export async function deleteVendorAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteVendor(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete vendor." };
  }
  revalidatePath("/network");
  return {};
}

/** Bulk-imports uploaded sheet rows as new vendors. Appends -- does not de-duplicate against existing vendors. */
export async function bulkCreateVendorsAction(rows: VendorImportRow[]): Promise<{ inserted?: number; error?: string }> {
  try {
    const result = await bulkCreateVendors(rows);
    revalidatePath("/network");
    return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to import vendors." };
  }
}

// ---------- Sites ----------

export async function listSitesAction(): Promise<Site[]> {
  return listSites();
}

export async function getSiteAction(id: string): Promise<Site | null> {
  return getSite(id);
}

export async function listSitesForCompanyAction(companyId: string): Promise<Site[]> {
  return listSitesForCompany(companyId);
}

export async function listSitesForVendorAction(vendorId: string): Promise<Site[]> {
  return listSitesForVendor(vendorId);
}

export async function listSitesForOpportunityAction(opportunityId: string): Promise<Site[]> {
  return listSitesForOpportunity(opportunityId);
}

export async function saveSiteAction(id: string | null, input: SiteInput): Promise<{ id?: string; error?: string }> {
  try {
    if (id) {
      await updateSite(id, input);
      revalidatePath("/network/sites");
      revalidatePath(`/network/sites/${id}`);
      return { id };
    }
    const newId = await createSite(input);
    revalidatePath("/network/sites");
    return { id: newId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save site." };
  }
}

export async function deleteSiteAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteSite(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete site." };
  }
  revalidatePath("/network/sites");
  return {};
}

/** Parses an uploaded sheet and returns its raw rows + column names, so the caller can map columns onto Site's fixed fields before importing. Nothing is saved yet. */
export async function parseSiteSheetAction(
  formData: FormData,
): Promise<{ rows?: Record<string, string | number | boolean | null>[]; columns?: string[]; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const sheets = await parseBuffer(buffer, file.name);
    const rows = sheets.find((s) => s.rows.length > 0)?.rows ?? [];
    if (rows.length === 0) {
      return { error: "No data rows were found in this file." };
    }
    return { rows, columns: Object.keys(rows[0]) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to parse file." };
  }
}

export async function bulkCreateSitesForOpportunityAction(
  opportunityId: string,
  companyId: string | null,
  rows: SiteImportRow[],
): Promise<{ inserted?: number; error?: string }> {
  try {
    const result = await bulkCreateSitesForOpportunity(opportunityId, companyId, rows);
    revalidatePath(`/crm/opportunities/${opportunityId}`);
    revalidatePath("/network/sites");
    return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to import sites." };
  }
}

export async function bulkCreateSitesAction(
  links: SiteBulkLinks,
  rows: SiteImportRow[],
): Promise<{ inserted?: number; error?: string }> {
  try {
    const result = await bulkCreateSites(links, rows);
    revalidatePath("/network/sites");
    if (links.opportunityId) revalidatePath(`/crm/opportunities/${links.opportunityId}`);
    if (links.contractId) revalidatePath("/crm/contracts");
    return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to import sites." };
  }
}

/** Adds the given trades to every listed site's existing Trade selection -- doesn't remove any trade a site already has. */
export async function bulkAssignTradesAction(siteIds: string[], trades: string[]): Promise<{ error?: string }> {
  try {
    await bulkAssignTrades(siteIds, trades);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to assign trades." };
  }
  revalidatePath("/network/sites");
  return {};
}

/** Builds a .xlsx workbook from already-shaped rows (e.g. the caller's currently filtered sites), returned as base64. */
export async function exportSitesToExcelAction(rows: DatasetRecord[], columns: string[]): Promise<string> {
  return buildXlsxBase64(rows, columns);
}

/** Updates existing sites in place from an uploaded sheet -- never creates new sites. See bulkUpdateSites for matching rules. */
export async function bulkUpdateSitesAction(
  rows: SiteUpdateRow[],
  companyId: string | null,
): Promise<SiteUpdateResult & { error?: string }> {
  try {
    const result = await bulkUpdateSites(rows, companyId);
    revalidatePath("/network/sites");
    return result;
  } catch (e) {
    return { updated: 0, notFound: [], ambiguous: [], error: e instanceof Error ? e.message : "Failed to update sites." };
  }
}

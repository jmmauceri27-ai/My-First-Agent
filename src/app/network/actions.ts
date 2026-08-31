"use server";

import { revalidatePath } from "next/cache";
import { buildXlsxBase64 } from "@/lib/exportExcel";
import { parseBuffer } from "@/lib/parse";
import type { DatasetRecord } from "@/lib/types";
import {
  bulkAssignContractForTrade,
  bulkAssignTrades,
  bulkAssignVendorForTrade,
  bulkCreateSites,
  bulkCreateSitesForOpportunity,
  bulkCreateVendors,
  bulkDeleteSites,
  bulkUnassignContractForTrade,
  bulkUnassignTrades,
  bulkUnassignVendorForTrade,
  bulkUpdateSiteMeasurements,
  bulkUpdateSiteRateSchedule,
  bulkUpdateSites,
  bulkUpdateSiteTradeAssignments,
  createSite,
  createSiteFilterTemplate,
  createVendor,
  deleteSite,
  deleteSiteFilterTemplate,
  deleteVendor,
  getSite,
  getVendor,
  listAssignmentsForSubVendor,
  listAssignmentsForVendor,
  listDuplicateSiteGroups,
  listSiteFilterTemplates,
  listSites,
  listSitesForCompany,
  listSitesForOpportunity,
  listVendors,
  mergeSites,
  saveSiteTradeAssignments,
  updateSite,
  updateSiteFilterTemplate,
  updateVendor,
} from "@/lib/networkDal";
import type {
  Site,
  SiteBulkLinks,
  SiteFilterTemplate,
  SiteFilters,
  SiteImportRow,
  SiteInput,
  SiteMeasurementsUpdateRow,
  SiteRateScheduleUpdateRow,
  SiteTradeAssignmentInput,
  SiteTradeAssignmentUpdateRow,
  SiteUpdateResult,
  SiteUpdateRow,
  Vendor,
  VendorImportRow,
  VendorInput,
  VendorTradeAssignment,
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

export async function listDuplicateSiteGroupsAction(): Promise<Site[][]> {
  return listDuplicateSiteGroups();
}

export async function mergeSitesAction(
  keepSiteId: string,
  deleteSiteIds: string[],
  input: SiteInput,
  assignments: SiteTradeAssignmentInput[],
): Promise<{ error?: string }> {
  try {
    await mergeSites(keepSiteId, deleteSiteIds, input, assignments);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to merge sites." };
  }
  revalidatePath("/network/sites");
  return {};
}

export async function listAssignmentsForVendorAction(vendorId: string): Promise<VendorTradeAssignment[]> {
  return listAssignmentsForVendor(vendorId);
}

export async function listAssignmentsForSubVendorAction(vendorId: string): Promise<VendorTradeAssignment[]> {
  return listAssignmentsForSubVendor(vendorId);
}

/** Replaces a site's full set of Trade assignments (Vendor/Sub-Vendor + pricing, one per trade). */
export async function saveSiteTradeAssignmentsAction(
  siteId: string,
  assignments: SiteTradeAssignmentInput[],
): Promise<{ error?: string }> {
  try {
    await saveSiteTradeAssignments(siteId, assignments);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save trade assignments." };
  }
  revalidatePath("/network/sites");
  revalidatePath(`/network/sites/${siteId}`);
  return {};
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

export async function bulkDeleteSitesAction(siteIds: string[]): Promise<{ error?: string }> {
  try {
    await bulkDeleteSites(siteIds);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete sites." };
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

/** Removes the given trades from every listed site's Trade selection, deleting each trade's assignment (Vendor/Sub-Vendor/Contract/pricing) along with it. */
export async function bulkUnassignTradesAction(siteIds: string[], trades: string[]): Promise<{ error?: string }> {
  try {
    await bulkUnassignTrades(siteIds, trades);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to remove trade." };
  }
  revalidatePath("/network/sites");
  return {};
}

/** Sets the Contract for one trade across every listed site -- e.g. "these 40 sites' Snow Removal work just got added to this signed contract." */
export async function bulkAssignContractAction(
  siteIds: string[],
  trade: string,
  contractId: string,
): Promise<{ error?: string }> {
  try {
    await bulkAssignContractForTrade(siteIds, trade, contractId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to assign contract." };
  }
  revalidatePath("/network/sites");
  return {};
}

/** Clears the Contract for one trade across every listed site, leaving Vendor/Sub-Vendor/pricing and every other trade's assignment untouched. */
export async function bulkUnassignContractAction(siteIds: string[], trade: string): Promise<{ error?: string }> {
  try {
    await bulkUnassignContractForTrade(siteIds, trade);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to unassign contract." };
  }
  revalidatePath("/network/sites");
  return {};
}

/** Assigns a Vendor (and optionally Sub-Vendor) for one trade across every listed site -- e.g. "these 27 sites use Vendor X for Snow Removal only." Adds the trade to each site's Trade selection and never touches any other trade's assignment. */
export async function bulkAssignVendorForTradeAction(
  siteIds: string[],
  trade: string,
  vendorId: string | null,
  subVendorId: string | null,
): Promise<{ error?: string }> {
  try {
    await bulkAssignVendorForTrade(siteIds, trade, vendorId, subVendorId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to assign vendor." };
  }
  revalidatePath("/network/sites");
  return {};
}

/** Clears the Vendor and Sub-Vendor for one trade across every listed site, leaving pricing/Contract and every other trade's assignment untouched. */
export async function bulkUnassignVendorAction(siteIds: string[], trade: string): Promise<{ error?: string }> {
  try {
    await bulkUnassignVendorForTrade(siteIds, trade);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to unassign vendor." };
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

/** Updates (or creates) one Trade's assignment -- Vendor/Sub-Vendor + pricing -- on each matched site, without touching any other trade. See bulkUpdateSiteTradeAssignments for matching rules. */
export async function bulkUpdateSiteTradeAssignmentsAction(
  trade: string,
  rows: SiteTradeAssignmentUpdateRow[],
  companyId: string | null,
): Promise<SiteUpdateResult & { error?: string }> {
  try {
    const result = await bulkUpdateSiteTradeAssignments(trade, rows, companyId);
    revalidatePath("/network/sites");
    return result;
  } catch (e) {
    return {
      updated: 0,
      notFound: [],
      ambiguous: [],
      error: e instanceof Error ? e.message : "Failed to update trade assignments.",
    };
  }
}

/** Bulk-sets Measurements (sq. ft) and/or Counts on matched sites from a sheet -- merges by label, never replaces the whole bag. See bulkUpdateSiteMeasurements for matching rules. */
export async function bulkUpdateSiteMeasurementsAction(
  rows: SiteMeasurementsUpdateRow[],
  companyId: string | null,
): Promise<SiteUpdateResult & { error?: string }> {
  try {
    const result = await bulkUpdateSiteMeasurements(rows, companyId);
    revalidatePath("/network/sites");
    return result;
  } catch (e) {
    return {
      updated: 0,
      notFound: [],
      ambiguous: [],
      error: e instanceof Error ? e.message : "Failed to update measurements.",
    };
  }
}

/** Merges each matched row's Rate Schedule months into one Trade's existing schedule, without touching any other trade or any month not present on the row. See bulkUpdateSiteRateSchedule for matching rules. */
export async function bulkUpdateSiteRateScheduleAction(
  trade: string,
  rows: SiteRateScheduleUpdateRow[],
  companyId: string | null,
): Promise<SiteUpdateResult & { error?: string }> {
  try {
    const result = await bulkUpdateSiteRateSchedule(trade, rows, companyId);
    revalidatePath("/network/sites");
    revalidatePath("/dashboards");
    return result;
  } catch (e) {
    return {
      updated: 0,
      notFound: [],
      ambiguous: [],
      error: e instanceof Error ? e.message : "Failed to update rate schedule.",
    };
  }
}

// ---------- Site Filter Templates ----------

export async function listSiteFilterTemplatesAction(): Promise<SiteFilterTemplate[]> {
  return listSiteFilterTemplates();
}

export async function saveSiteFilterTemplateAction(
  id: string | null,
  name: string,
  filters: SiteFilters,
): Promise<{ id?: string; error?: string }> {
  try {
    if (id) {
      await updateSiteFilterTemplate(id, name, filters);
      revalidatePath("/network/sites");
      return { id };
    }
    const newId = await createSiteFilterTemplate(name, filters);
    revalidatePath("/network/sites");
    return { id: newId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save filter template." };
  }
}

export async function deleteSiteFilterTemplateAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteSiteFilterTemplate(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete filter template." };
  }
  revalidatePath("/network/sites");
  return {};
}

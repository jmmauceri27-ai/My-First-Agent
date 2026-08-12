"use server";

import { revalidatePath } from "next/cache";
import { parseBuffer } from "@/lib/parse";
import {
  bulkCreateSitesForOpportunity,
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
import type { Site, SiteImportRow, SiteInput, Vendor, VendorInput } from "@/lib/networkTypes";

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

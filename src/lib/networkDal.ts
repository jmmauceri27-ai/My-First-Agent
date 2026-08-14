import "server-only";
import { createAdminClient, OWNER_USER_ID } from "./supabase/admin";
import type { Site, SiteImportRow, SiteInput, Vendor, VendorInput } from "./networkTypes";

// ---------- Vendors ----------

function mapVendor(v: Record<string, unknown>): Vendor {
  return {
    id: v.id as string,
    name: v.name as string,
    services: v.services as string | null,
    contactName: v.contact_name as string | null,
    email: v.email as string | null,
    phone: v.phone as string | null,
    website: v.website as string | null,
    address: v.address as string | null,
    city: v.city as string | null,
    state: v.state as string | null,
    lat: v.lat as number | null,
    lng: v.lng as number | null,
    notes: v.notes as string | null,
    createdAt: v.created_at as string,
    updatedAt: v.updated_at as string,
  };
}

export async function listVendors(): Promise<Vendor[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapVendor);
}

export async function getVendor(id: string): Promise<Vendor | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapVendor(data);
}

function vendorRow(input: VendorInput) {
  return {
    name: input.name,
    services: input.services,
    contact_name: input.contactName,
    email: input.email,
    phone: input.phone,
    website: input.website,
    address: input.address,
    city: input.city,
    state: input.state,
    lat: input.lat,
    lng: input.lng,
    notes: input.notes,
  };
}

export async function createVendor(input: VendorInput): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vendors")
    .insert({ user_id: OWNER_USER_ID, ...vendorRow(input) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateVendor(id: string, input: VendorInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("vendors")
    .update({ ...vendorRow(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function deleteVendor(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("vendors").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

// ---------- Sites ----------

const SITE_COLUMNS =
  "id, company_id, opportunity_id, contract_id, vendor_id, name, address, lat, lng, contract_value, sub_price, measurements, notes, created_at, updated_at, crm_companies(name), crm_opportunities(name), crm_contracts(name), vendors(name)";

function mapSite(s: Record<string, unknown>): Site {
  const company = s.crm_companies as unknown as { name: string } | null;
  const opportunity = s.crm_opportunities as unknown as { name: string } | null;
  const contract = s.crm_contracts as unknown as { name: string } | null;
  const vendor = s.vendors as unknown as { name: string } | null;
  return {
    id: s.id as string,
    companyId: s.company_id as string | null,
    companyName: company?.name ?? null,
    opportunityId: s.opportunity_id as string | null,
    opportunityName: opportunity?.name ?? null,
    contractId: s.contract_id as string | null,
    contractName: contract?.name ?? null,
    vendorId: s.vendor_id as string | null,
    vendorName: vendor?.name ?? null,
    name: s.name as string,
    address: s.address as string | null,
    lat: s.lat as number | null,
    lng: s.lng as number | null,
    contractValue: s.contract_value as number | null,
    subPrice: s.sub_price as number | null,
    measurements: (s.measurements as Site["measurements"] | null) ?? {},
    notes: s.notes as string | null,
    createdAt: s.created_at as string,
    updatedAt: s.updated_at as string,
  };
}

export async function listSites(): Promise<Site[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select(SITE_COLUMNS)
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSite);
}

export async function getSite(id: string): Promise<Site | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select(SITE_COLUMNS)
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapSite(data);
}

export async function listSitesForCompany(companyId: string): Promise<Site[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select(SITE_COLUMNS)
    .eq("company_id", companyId)
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSite);
}

export async function listSitesForVendor(vendorId: string): Promise<Site[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select(SITE_COLUMNS)
    .eq("vendor_id", vendorId)
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSite);
}

export async function listSitesForOpportunity(opportunityId: string): Promise<Site[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select(SITE_COLUMNS)
    .eq("opportunity_id", opportunityId)
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSite);
}

export async function listSitesForContract(contractId: string): Promise<Site[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select(SITE_COLUMNS)
    .eq("contract_id", contractId)
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSite);
}

async function syncOpportunitySiteCount(opportunityId: string): Promise<void> {
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("opportunity_id", opportunityId)
    .eq("user_id", OWNER_USER_ID);
  if (countError) throw new Error(countError.message);

  const { error } = await supabase
    .from("crm_opportunities")
    .update({ site_count: count ?? 0, updated_at: new Date().toISOString() })
    .eq("id", opportunityId)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

async function syncContractSiteCount(contractId: string): Promise<void> {
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId)
    .eq("user_id", OWNER_USER_ID);
  if (countError) throw new Error(countError.message);

  const { error } = await supabase
    .from("crm_contracts")
    .update({ site_count: count ?? 0, updated_at: new Date().toISOString() })
    .eq("id", contractId)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

function siteRow(input: SiteInput) {
  return {
    company_id: input.companyId,
    opportunity_id: input.opportunityId,
    contract_id: input.contractId,
    vendor_id: input.vendorId,
    name: input.name,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    contract_value: input.contractValue,
    sub_price: input.subPrice,
    measurements: input.measurements,
    notes: input.notes,
  };
}

export async function createSite(input: SiteInput): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .insert({ user_id: OWNER_USER_ID, ...siteRow(input) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (input.opportunityId) await syncOpportunitySiteCount(input.opportunityId);
  if (input.contractId) await syncContractSiteCount(input.contractId);
  return data.id as string;
}

export async function updateSite(id: string, input: SiteInput): Promise<void> {
  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from("sites")
    .select("opportunity_id, contract_id")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("sites")
    .update({ ...siteRow(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);

  const previousOpportunityId = existing?.opportunity_id as string | null | undefined;
  if (previousOpportunityId && previousOpportunityId !== input.opportunityId) {
    await syncOpportunitySiteCount(previousOpportunityId);
  }
  if (input.opportunityId) await syncOpportunitySiteCount(input.opportunityId);

  const previousContractId = existing?.contract_id as string | null | undefined;
  if (previousContractId && previousContractId !== input.contractId) {
    await syncContractSiteCount(previousContractId);
  }
  if (input.contractId) await syncContractSiteCount(input.contractId);
}

export async function deleteSite(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from("sites")
    .select("opportunity_id, contract_id")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from("sites").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);

  const opportunityId = existing?.opportunity_id as string | null | undefined;
  if (opportunityId) await syncOpportunitySiteCount(opportunityId);

  const contractId = existing?.contract_id as string | null | undefined;
  if (contractId) await syncContractSiteCount(contractId);
}

/** Bulk-imports uploaded sheet rows as new sites, scoped to one opportunity (and its company). Appends -- does not replace existing sites. */
export async function bulkCreateSitesForOpportunity(
  opportunityId: string,
  companyId: string | null,
  rows: SiteImportRow[],
): Promise<{ inserted: number }> {
  const supabase = createAdminClient();
  const batch = rows.map((row) => ({
    user_id: OWNER_USER_ID,
    company_id: companyId,
    opportunity_id: opportunityId,
    contract_id: null,
    vendor_id: null,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    contract_value: row.contractValue,
    sub_price: row.subPrice,
    measurements: {},
    notes: null,
  }));

  const { error } = await supabase.from("sites").insert(batch);
  if (error) throw new Error(error.message);

  await syncOpportunitySiteCount(opportunityId);
  return { inserted: batch.length };
}

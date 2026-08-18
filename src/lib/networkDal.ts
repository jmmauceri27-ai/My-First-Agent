import "server-only";
import { createAdminClient, OWNER_USER_ID } from "./supabase/admin";
import type {
  Site,
  SiteBulkLinks,
  SiteFilterTemplate,
  SiteFilters,
  SiteImportRow,
  SiteInput,
  SiteMeasurementsUpdateRow,
  SiteTradeAssignment,
  SiteTradeAssignmentInput,
  SiteTradeAssignmentUpdateRow,
  SiteUpdateResult,
  SiteUpdateRow,
  Vendor,
  VendorImportRow,
  VendorInput,
  VendorTradeAssignment,
} from "./networkTypes";
import { matchTrade } from "./trades";

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

/** Bulk-imports uploaded sheet rows as new vendors. Appends -- does not de-duplicate against existing vendors. */
export async function bulkCreateVendors(rows: VendorImportRow[]): Promise<{ inserted: number }> {
  const supabase = createAdminClient();
  const batch = rows.map((row) => ({
    user_id: OWNER_USER_ID,
    name: row.name,
    services: row.services,
    contact_name: row.contactName,
    email: row.email,
    phone: row.phone,
    website: row.website,
    address: row.address,
    city: row.city,
    state: row.state,
    notes: row.notes,
  }));

  const batchSize = 500;
  for (let i = 0; i < batch.length; i += batchSize) {
    const { error } = await supabase.from("vendors").insert(batch.slice(i, i + batchSize));
    if (error) throw new Error(error.message);
  }
  return { inserted: batch.length };
}

// ---------- Sites ----------

const ASSIGNMENT_COLUMNS =
  "id, site_id, trade, vendor_id, sub_vendor_id, contract_value, sub_price, sub_vendor_price, vendor:vendors!site_trade_assignments_vendor_id_fkey(name), sub_vendor:vendors!site_trade_assignments_sub_vendor_id_fkey(name)";

function mapAssignment(a: Record<string, unknown>): SiteTradeAssignment {
  const vendor = a.vendor as unknown as { name: string } | null;
  const subVendor = a.sub_vendor as unknown as { name: string } | null;
  return {
    id: a.id as string,
    siteId: a.site_id as string,
    trade: a.trade as string,
    vendorId: a.vendor_id as string | null,
    vendorName: vendor?.name ?? null,
    subVendorId: a.sub_vendor_id as string | null,
    subVendorName: subVendor?.name ?? null,
    contractValue: a.contract_value as number | null,
    subPrice: a.sub_price as number | null,
    subVendorPrice: a.sub_vendor_price as number | null,
  };
}

const SITE_COLUMNS = `id, company_id, opportunity_id, contract_id, site_code, name, address, city, state, zip, lat, lng, trades, measurements, counts, notes, created_at, updated_at, crm_companies(name), crm_opportunities(name), crm_contracts(name), site_trade_assignments(${ASSIGNMENT_COLUMNS})`;

function mapSite(s: Record<string, unknown>): Site {
  const company = s.crm_companies as unknown as { name: string } | null;
  const opportunity = s.crm_opportunities as unknown as { name: string } | null;
  const contract = s.crm_contracts as unknown as { name: string } | null;
  const assignments = (s.site_trade_assignments as Record<string, unknown>[] | null) ?? [];
  return {
    id: s.id as string,
    companyId: s.company_id as string | null,
    companyName: company?.name ?? null,
    opportunityId: s.opportunity_id as string | null,
    opportunityName: opportunity?.name ?? null,
    contractId: s.contract_id as string | null,
    contractName: contract?.name ?? null,
    siteCode: s.site_code as string | null,
    name: s.name as string,
    address: s.address as string | null,
    city: s.city as string | null,
    state: s.state as string | null,
    zip: s.zip as string | null,
    lat: s.lat as number | null,
    lng: s.lng as number | null,
    trades: (s.trades as string[] | null) ?? [],
    tradeAssignments: assignments.map(mapAssignment),
    measurements: (s.measurements as Site["measurements"] | null) ?? {},
    counts: (s.counts as Site["counts"] | null) ?? {},
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

const VENDOR_ASSIGNMENT_COLUMNS = `${ASSIGNMENT_COLUMNS}, sites(name, crm_companies(name))`;

function mapVendorAssignment(a: Record<string, unknown>): VendorTradeAssignment {
  const site = a.sites as unknown as { name: string; crm_companies: { name: string } | null } | null;
  return {
    ...mapAssignment(a),
    siteName: site?.name ?? "",
    companyName: site?.crm_companies?.name ?? null,
  };
}

/** Every (site, trade) this vendor is contracted to directly. */
export async function listAssignmentsForVendor(vendorId: string): Promise<VendorTradeAssignment[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_trade_assignments")
    .select(VENDOR_ASSIGNMENT_COLUMNS)
    .eq("vendor_id", vendorId)
    .eq("user_id", OWNER_USER_ID)
    .order("trade", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapVendorAssignment);
}

/** Every (site, trade) where this vendor is used as the *Sub-Vendor* -- i.e. subcontracted by another Vendor, rather than contracted to directly. */
export async function listAssignmentsForSubVendor(vendorId: string): Promise<VendorTradeAssignment[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_trade_assignments")
    .select(VENDOR_ASSIGNMENT_COLUMNS)
    .eq("sub_vendor_id", vendorId)
    .eq("user_id", OWNER_USER_ID)
    .order("trade", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapVendorAssignment);
}

/** Replaces a site's full set of Trade assignments with the given list -- upserts each by (site_id, trade) and removes any existing assignment for a trade no longer included. */
export async function saveSiteTradeAssignments(siteId: string, assignments: SiteTradeAssignmentInput[]): Promise<void> {
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("site_trade_assignments")
    .select("id, trade")
    .eq("site_id", siteId)
    .eq("user_id", OWNER_USER_ID);
  if (fetchError) throw new Error(fetchError.message);

  const keepTrades = new Set(assignments.map((a) => a.trade));
  const staleIds = (existing ?? []).filter((e) => !keepTrades.has(e.trade as string)).map((e) => e.id as string);
  if (staleIds.length > 0) {
    const { error } = await supabase.from("site_trade_assignments").delete().in("id", staleIds);
    if (error) throw new Error(error.message);
  }

  if (assignments.length === 0) return;

  const rows = assignments.map((a) => ({
    user_id: OWNER_USER_ID,
    site_id: siteId,
    trade: a.trade,
    vendor_id: a.vendorId,
    sub_vendor_id: a.subVendorId,
    contract_value: a.contractValue,
    sub_price: a.subPrice,
    sub_vendor_price: a.subVendorPrice,
  }));

  const { error } = await supabase.from("site_trade_assignments").upsert(rows, { onConflict: "site_id,trade" });
  if (error) throw new Error(error.message);
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
    site_code: input.siteCode,
    name: input.name,
    address: input.address,
    city: input.city,
    state: input.state,
    zip: input.zip,
    lat: input.lat,
    lng: input.lng,
    trades: input.trades,
    measurements: input.measurements,
    counts: input.counts,
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

/** Bulk-imports uploaded sheet rows as new sites, all sharing the same Client/Opportunity/Contract/Trades links. Vendor assignments are per-trade and set afterward from each site's detail page. Appends -- does not replace existing sites. */
export async function bulkCreateSites(links: SiteBulkLinks, rows: SiteImportRow[]): Promise<{ inserted: number }> {
  const supabase = createAdminClient();
  const batch = rows.map((row) => ({
    user_id: OWNER_USER_ID,
    company_id: row.companyId !== undefined ? row.companyId : links.companyId,
    opportunity_id: links.opportunityId,
    contract_id: links.contractId,
    site_code: row.siteCode,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    lat: row.lat,
    lng: row.lng,
    trades: links.trades,
    measurements: {},
    counts: {},
    notes: null,
  }));

  const batchSize = 500;
  for (let i = 0; i < batch.length; i += batchSize) {
    const { error } = await supabase.from("sites").insert(batch.slice(i, i + batchSize));
    if (error) throw new Error(error.message);
  }

  if (links.opportunityId) await syncOpportunitySiteCount(links.opportunityId);
  if (links.contractId) await syncContractSiteCount(links.contractId);
  return { inserted: batch.length };
}

/** Bulk-imports uploaded sheet rows as new sites, scoped to one opportunity (and its company). Trades default to the opportunity's own "Trade" field, when it matches one of the fixed options. Appends -- does not replace existing sites. */
export async function bulkCreateSitesForOpportunity(
  opportunityId: string,
  companyId: string | null,
  rows: SiteImportRow[],
): Promise<{ inserted: number }> {
  const supabase = createAdminClient();
  const { data: opportunity, error } = await supabase
    .from("crm_opportunities")
    .select("work_type")
    .eq("id", opportunityId)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const matched = matchTrade(opportunity?.work_type as string | null);
  return bulkCreateSites({ companyId, opportunityId, contractId: null, trades: matched ? [matched] : [] }, rows);
}

/** Adds the given trades to every listed site's existing Trade selection (union, not replace). */
export async function bulkAssignTrades(siteIds: string[], trades: string[]): Promise<void> {
  if (siteIds.length === 0 || trades.length === 0) return;
  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from("sites")
    .select("id, trades")
    .in("id", siteIds)
    .eq("user_id", OWNER_USER_ID);
  if (fetchError) throw new Error(fetchError.message);

  const updates = (existing ?? []).map((s) => ({
    id: s.id as string,
    trades: Array.from(new Set([...(((s.trades as string[] | null) ?? [])), ...trades])),
  }));

  const concurrency = 20;
  for (let i = 0; i < updates.length; i += concurrency) {
    const batch = updates.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((u) =>
        supabase
          .from("sites")
          .update({ trades: u.trades, updated_at: new Date().toISOString() })
          .eq("id", u.id)
          .eq("user_id", OWNER_USER_ID),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }
}

/**
 * Updates existing sites in place from an uploaded sheet -- never creates new rows. Each row is matched by
 * trying `matchCode` (the custom Site ID, if the sheet has one) first, then falling back to `matchId` (the
 * database's own record id), then `matchName` (case-insensitive, optionally scoped to `companyId` to
 * disambiguate sites that share a name across different clients) -- e.g. when populating Site IDs for the
 * first time, no site has a matching code yet, so matching falls back to name. A method only stops the
 * cascade by finding a unique match or an ambiguous one (multiple sites sharing the same key); "not found"
 * always falls through to the next configured method. Only the fields present on the row are written;
 * anything the row doesn't include is left exactly as it was.
 */
interface SiteMatchKeys {
  matchCode: string | null;
  matchId: string | null;
  matchName: string | null;
}

/**
 * Resolves each row's `matchCode` (custom Site ID) / `matchId` (record id) / `matchName` (case-insensitive,
 * optionally scoped to `companyId`) to a site id, trying each in order and falling through on "not found"
 * (but not on ambiguous, which is reported immediately). Shared by every bulk-update flow that matches rows
 * to existing sites, so Site-field updates and per-trade assignment updates use identical matching rules.
 */
async function matchSiteIds<T extends SiteMatchKeys>(
  rows: T[],
  companyId: string | null,
): Promise<{ siteIds: (string | null)[]; notFound: string[]; ambiguous: string[] }> {
  const supabase = createAdminClient();
  let query = supabase.from("sites").select("id, name, site_code").eq("user_id", OWNER_USER_ID);
  if (companyId) query = query.eq("company_id", companyId);
  const { data: existing, error: fetchError } = await query;
  if (fetchError) throw new Error(fetchError.message);

  const byId = new Map<string, string>();
  const byName = new Map<string, string[]>();
  const byCode = new Map<string, string[]>();
  for (const s of existing ?? []) {
    const id = s.id as string;
    byId.set(id, id);
    const nameKey = (s.name as string).trim().toLowerCase();
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), id]);
    const code = s.site_code as string | null;
    if (code && code.trim()) {
      const codeKey = code.trim().toLowerCase();
      byCode.set(codeKey, [...(byCode.get(codeKey) ?? []), id]);
    }
  }

  const notFound: string[] = [];
  const ambiguous: string[] = [];
  const siteIds: (string | null)[] = [];

  for (const row of rows) {
    let siteId: string | null = null;
    let notFoundKey: string | null = null;
    let ambiguousKey: string | null = null;

    if (!siteId && !ambiguousKey && row.matchCode) {
      const key = row.matchCode.trim().toLowerCase();
      const matches = byCode.get(key) ?? [];
      if (matches.length === 1) siteId = matches[0];
      else if (matches.length > 1) ambiguousKey = row.matchCode;
      else notFoundKey = row.matchCode;
    }
    if (!siteId && !ambiguousKey && row.matchId) {
      const match = byId.get(row.matchId);
      if (match) siteId = match;
      else notFoundKey = row.matchId;
    }
    if (!siteId && !ambiguousKey && row.matchName) {
      const key = row.matchName.trim().toLowerCase();
      const matches = byName.get(key) ?? [];
      if (matches.length === 1) siteId = matches[0];
      else if (matches.length > 1) ambiguousKey = row.matchName;
      else notFoundKey = row.matchName;
    }

    if (!siteId) {
      if (ambiguousKey) ambiguous.push(ambiguousKey);
      else if (notFoundKey) notFound.push(notFoundKey);
    }
    siteIds.push(siteId);
  }

  return { siteIds, notFound, ambiguous };
}

export async function bulkUpdateSites(rows: SiteUpdateRow[], companyId: string | null): Promise<SiteUpdateResult> {
  const supabase = createAdminClient();
  const { siteIds, notFound, ambiguous } = await matchSiteIds(rows, companyId);

  const updates: { id: string; payload: Record<string, unknown> }[] = [];
  rows.forEach((row, i) => {
    const siteId = siteIds[i];
    if (!siteId) return;

    const payload: Record<string, unknown> = {};
    if ("siteCode" in row) payload.site_code = row.siteCode;
    if ("address" in row) payload.address = row.address;
    if ("city" in row) payload.city = row.city;
    if ("state" in row) payload.state = row.state;
    if ("zip" in row) payload.zip = row.zip;
    if ("lat" in row) payload.lat = row.lat;
    if ("lng" in row) payload.lng = row.lng;
    if ("trades" in row) payload.trades = row.trades;
    if ("notes" in row) payload.notes = row.notes;
    if (Object.keys(payload).length === 0) return;

    updates.push({ id: siteId, payload });
  });

  const concurrency = 20;
  for (let i = 0; i < updates.length; i += concurrency) {
    const batch = updates.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((u) =>
        supabase
          .from("sites")
          .update({ ...u.payload, updated_at: new Date().toISOString() })
          .eq("id", u.id)
          .eq("user_id", OWNER_USER_ID),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }

  return { updated: updates.length, notFound, ambiguous };
}

/**
 * Updates (or creates, if the site doesn't have one yet) the single named Trade's assignment -- Vendor,
 * Sub-Vendor, Contract Value, Sub Price, Sub-Vendor Price -- for each matched site. Scoped to exactly one
 * trade so e.g. bulk-updating "Land" contract values can never touch a site's "Snow Removal" assignment.
 * Only the fields present on a row are written; matching rules are identical to bulkUpdateSites.
 */
export async function bulkUpdateSiteTradeAssignments(
  trade: string,
  rows: SiteTradeAssignmentUpdateRow[],
  companyId: string | null,
): Promise<SiteUpdateResult> {
  const supabase = createAdminClient();
  const { siteIds, notFound, ambiguous } = await matchSiteIds(rows, companyId);

  const updates: { siteId: string; payload: Record<string, unknown> }[] = [];
  rows.forEach((row, i) => {
    const siteId = siteIds[i];
    if (!siteId) return;

    const payload: Record<string, unknown> = {};
    if ("vendorId" in row) payload.vendor_id = row.vendorId;
    if ("subVendorId" in row) payload.sub_vendor_id = row.subVendorId;
    if ("contractValue" in row) payload.contract_value = row.contractValue;
    if ("subPrice" in row) payload.sub_price = row.subPrice;
    if ("subVendorPrice" in row) payload.sub_vendor_price = row.subVendorPrice;
    if (Object.keys(payload).length === 0) return;

    updates.push({ siteId, payload });
  });

  const concurrency = 20;
  for (let i = 0; i < updates.length; i += concurrency) {
    const batch = updates.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (u) => {
        const { data, error } = await supabase
          .from("site_trade_assignments")
          .update({ ...u.payload, updated_at: new Date().toISOString() })
          .eq("site_id", u.siteId)
          .eq("trade", trade)
          .eq("user_id", OWNER_USER_ID)
          .select("id");
        if (error) return { error };
        if (!data || data.length === 0) {
          const { error: insertError } = await supabase
            .from("site_trade_assignments")
            .insert({ user_id: OWNER_USER_ID, site_id: u.siteId, trade, ...u.payload });
          if (insertError) return { error: insertError };
        }
        return { error: null };
      }),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }

  return { updated: updates.length, notFound, ambiguous };
}

/**
 * Merges each matched row's `measurements`/`counts` labels into the site's existing bags (added or
 * overwritten by label) -- never replaces the whole bag, so uploading one batch of labels doesn't erase
 * labels set by an earlier upload or entered manually. Matching rules are identical to bulkUpdateSites.
 */
export async function bulkUpdateSiteMeasurements(
  rows: SiteMeasurementsUpdateRow[],
  companyId: string | null,
): Promise<SiteUpdateResult> {
  const supabase = createAdminClient();
  const { siteIds, notFound, ambiguous } = await matchSiteIds(rows, companyId);

  const matchedIds = Array.from(new Set(siteIds.filter((id): id is string => !!id)));
  const { data: existingSites, error: fetchError } =
    matchedIds.length > 0
      ? await supabase.from("sites").select("id, measurements, counts").in("id", matchedIds).eq("user_id", OWNER_USER_ID)
      : { data: [] as { id: string; measurements: unknown; counts: unknown }[], error: null };
  if (fetchError) throw new Error(fetchError.message);
  const existingById = new Map((existingSites ?? []).map((s) => [s.id as string, s]));

  const updates: { id: string; payload: Record<string, unknown> }[] = [];
  rows.forEach((row, i) => {
    const siteId = siteIds[i];
    if (!siteId) return;
    if (Object.keys(row.measurements).length === 0 && Object.keys(row.counts).length === 0) return;

    const existing = existingById.get(siteId);
    const mergedMeasurements = {
      ...((existing?.measurements as Record<string, number> | null) ?? {}),
      ...row.measurements,
    };
    const mergedCounts = { ...((existing?.counts as Record<string, number> | null) ?? {}), ...row.counts };
    updates.push({ id: siteId, payload: { measurements: mergedMeasurements, counts: mergedCounts } });
  });

  const concurrency = 20;
  for (let i = 0; i < updates.length; i += concurrency) {
    const batch = updates.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((u) =>
        supabase
          .from("sites")
          .update({ ...u.payload, updated_at: new Date().toISOString() })
          .eq("id", u.id)
          .eq("user_id", OWNER_USER_ID),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }

  return { updated: updates.length, notFound, ambiguous };
}

// ---------- Site Filter Templates ----------

const EMPTY_SITE_FILTERS: SiteFilters = {
  companyFilters: [],
  vendorFilter: "",
  subVendorFilter: "",
  contractFilter: "",
  tradeFilter: [],
  colorMode: "none",
  addressField: "address",
  addressValues: [],
  infoField: "name",
  infoValues: [],
};

function mapSiteFilterTemplate(t: Record<string, unknown>): SiteFilterTemplate {
  return {
    id: t.id as string,
    name: t.name as string,
    filters: { ...EMPTY_SITE_FILTERS, ...((t.filters as Partial<SiteFilters> | null) ?? {}) },
    createdAt: t.created_at as string,
    updatedAt: t.updated_at as string,
  };
}

export async function listSiteFilterTemplates(): Promise<SiteFilterTemplate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_filter_templates")
    .select("*")
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSiteFilterTemplate);
}

export async function createSiteFilterTemplate(name: string, filters: SiteFilters): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_filter_templates")
    .insert({ user_id: OWNER_USER_ID, name, filters })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateSiteFilterTemplate(id: string, name: string, filters: SiteFilters): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("site_filter_templates")
    .update({ name, filters, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function deleteSiteFilterTemplate(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("site_filter_templates").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

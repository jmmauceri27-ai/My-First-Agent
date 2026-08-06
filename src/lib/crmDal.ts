import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient, OWNER_USER_ID } from "./supabase/admin";
import type {
  Company,
  CompanyInput,
  Contact,
  ContactInput,
  Contract,
  ContractInput,
  Employee,
  Opportunity,
  OpportunityFile,
  OpportunityInput,
  OpportunitySiteBinding,
  OpportunitySiteRow,
  OpportunityStage,
} from "./crmTypes";
import type { DatasetRecord } from "./types";

const ATTACHMENTS_BUCKET = "crm-attachments";

// ---------- Companies ----------

export async function listCompanies(): Promise<Company[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_companies")
    .select("id, name, address, city, state, website, notes, created_at")
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    address: c.address as string | null,
    city: c.city as string | null,
    state: c.state as string | null,
    website: c.website as string | null,
    notes: c.notes as string | null,
    createdAt: c.created_at as string,
  }));
}

export async function createCompany(input: CompanyInput): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_companies")
    .insert({
      user_id: OWNER_USER_ID,
      name: input.name,
      address: input.address,
      city: input.city,
      state: input.state,
      website: input.website,
      notes: input.notes,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateCompany(id: string, input: CompanyInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_companies")
    .update({
      name: input.name,
      address: input.address,
      city: input.city,
      state: input.state,
      website: input.website,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function deleteCompany(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_companies").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

// ---------- Contacts ----------

export async function listContacts(): Promise<Contact[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_contacts")
    .select("id, company_id, name, email, phone, title, notes, created_at, crm_companies(name)")
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => {
    const company = c.crm_companies as unknown as { name: string } | null;
    return {
      id: c.id as string,
      companyId: c.company_id as string | null,
      companyName: company?.name ?? null,
      name: c.name as string,
      email: c.email as string | null,
      phone: c.phone as string | null,
      title: c.title as string | null,
      notes: c.notes as string | null,
      createdAt: c.created_at as string,
    };
  });
}

export async function createContact(input: ContactInput): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_contacts")
    .insert({
      user_id: OWNER_USER_ID,
      company_id: input.companyId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      title: input.title,
      notes: input.notes,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateContact(id: string, input: ContactInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_contacts")
    .update({
      company_id: input.companyId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      title: input.title,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_contacts").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

// ---------- Employees ----------

export async function listEmployees(): Promise<Employee[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_employees")
    .select("id, name, created_at")
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((e) => ({
    id: e.id as string,
    name: e.name as string,
    createdAt: e.created_at as string,
  }));
}

export async function createEmployee(name: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_employees")
    .insert({ user_id: OWNER_USER_ID, name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteEmployee(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_employees").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

// ---------- Contracts ----------
// Existing signed contracts (as opposed to crm_opportunities, the open
// pipeline): a validity window, rate, site count, and type of work.

const CONTRACT_COLUMNS =
  "id, company_id, name, work_type, site_count, rate_amount, rate_frequency, start_date, end_date, notes, created_at, updated_at, crm_companies(name)";

function mapContract(c: Record<string, unknown>): Contract {
  const company = c.crm_companies as unknown as { name: string } | null;
  return {
    id: c.id as string,
    companyId: c.company_id as string | null,
    companyName: company?.name ?? null,
    name: c.name as string,
    workType: c.work_type as string | null,
    siteCount: c.site_count as number | null,
    rateAmount: c.rate_amount as number | null,
    rateFrequency: c.rate_frequency as string | null,
    startDate: c.start_date as string | null,
    endDate: c.end_date as string | null,
    notes: c.notes as string | null,
    createdAt: c.created_at as string,
    updatedAt: c.updated_at as string,
  };
}

export async function listContracts(): Promise<Contract[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_contracts")
    .select(CONTRACT_COLUMNS)
    .eq("user_id", OWNER_USER_ID)
    .order("end_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapContract);
}

export async function createContract(input: ContractInput): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_contracts")
    .insert({
      user_id: OWNER_USER_ID,
      company_id: input.companyId,
      name: input.name,
      work_type: input.workType,
      site_count: input.siteCount,
      rate_amount: input.rateAmount,
      rate_frequency: input.rateFrequency,
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateContract(id: string, input: ContractInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_contracts")
    .update({
      company_id: input.companyId,
      name: input.name,
      work_type: input.workType,
      site_count: input.siteCount,
      rate_amount: input.rateAmount,
      rate_frequency: input.rateFrequency,
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function deleteContract(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_contracts").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

// ---------- Opportunities ----------

const OPPORTUNITY_COLUMNS =
  "id, name, company_id, stage, amount, site_count, work_type, expected_close_date, notes, sales_manager_id, position, created_at, updated_at, crm_companies(name), crm_employees(name), crm_opportunity_contacts(contact_id)";

function mapOpportunity(o: Record<string, unknown>): Opportunity {
  const company = o.crm_companies as unknown as { name: string } | null;
  const salesManager = o.crm_employees as unknown as { name: string } | null;
  const contactRows = (o.crm_opportunity_contacts ?? []) as unknown as { contact_id: string }[];
  return {
    id: o.id as string,
    name: o.name as string,
    companyId: o.company_id as string | null,
    companyName: company?.name ?? null,
    stage: o.stage as OpportunityStage,
    amount: o.amount as number | null,
    siteCount: o.site_count as number | null,
    workType: o.work_type as string | null,
    expectedCloseDate: o.expected_close_date as string | null,
    notes: o.notes as string | null,
    contactIds: contactRows.map((r) => r.contact_id),
    salesManagerId: o.sales_manager_id as string | null,
    salesManagerName: salesManager?.name ?? null,
    position: o.position as number,
    createdAt: o.created_at as string,
    updatedAt: o.updated_at as string,
  };
}

export async function listOpportunities(): Promise<Opportunity[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_opportunities")
    .select(OPPORTUNITY_COLUMNS)
    .eq("user_id", OWNER_USER_ID)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapOpportunity);
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_opportunities")
    .select(OPPORTUNITY_COLUMNS)
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapOpportunity(data);
}

async function nextPositionForStage(stage: OpportunityStage): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("crm_opportunities")
    .select("position")
    .eq("user_id", OWNER_USER_ID)
    .eq("stage", stage)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? -1) + 1;
}

async function setOpportunityContacts(opportunityId: string, contactIds: string[]): Promise<void> {
  const supabase = createAdminClient();
  const { error: deleteError } = await supabase
    .from("crm_opportunity_contacts")
    .delete()
    .eq("opportunity_id", opportunityId);
  if (deleteError) throw new Error(deleteError.message);

  if (contactIds.length > 0) {
    const { error: insertError } = await supabase
      .from("crm_opportunity_contacts")
      .insert(contactIds.map((contactId) => ({ opportunity_id: opportunityId, contact_id: contactId })));
    if (insertError) throw new Error(insertError.message);
  }
}

export async function createOpportunity(input: OpportunityInput): Promise<string> {
  const supabase = createAdminClient();
  const position = await nextPositionForStage(input.stage);

  const { data, error } = await supabase
    .from("crm_opportunities")
    .insert({
      user_id: OWNER_USER_ID,
      name: input.name,
      company_id: input.companyId,
      stage: input.stage,
      amount: input.amount,
      site_count: input.siteCount,
      work_type: input.workType,
      expected_close_date: input.expectedCloseDate,
      notes: input.notes,
      sales_manager_id: input.salesManagerId,
      position,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const opportunityId = data.id as string;
  await setOpportunityContacts(opportunityId, input.contactIds);
  return opportunityId;
}

export async function updateOpportunity(id: string, input: OpportunityInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_opportunities")
    .update({
      name: input.name,
      company_id: input.companyId,
      stage: input.stage,
      amount: input.amount,
      site_count: input.siteCount,
      work_type: input.workType,
      expected_close_date: input.expectedCloseDate,
      notes: input.notes,
      sales_manager_id: input.salesManagerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);

  await setOpportunityContacts(id, input.contactIds);
}

/** Moves a card to a (possibly new) stage, appending it to the end of that column. */
export async function updateOpportunityStage(id: string, stage: OpportunityStage): Promise<void> {
  const supabase = createAdminClient();
  const position = await nextPositionForStage(stage);
  const { error } = await supabase
    .from("crm_opportunities")
    .update({ stage, position, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function deleteOpportunity(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_opportunities")
    .delete()
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

// ---------- Opportunity file attachments ----------

function mapOpportunityFile(f: Record<string, unknown>): OpportunityFile {
  return {
    id: f.id as string,
    opportunityId: f.opportunity_id as string,
    fileName: f.file_name as string,
    storagePath: f.storage_path as string,
    contentType: f.content_type as string | null,
    sizeBytes: Number(f.size_bytes),
    uploadedAt: f.uploaded_at as string,
  };
}

export async function listOpportunityFiles(opportunityId: string): Promise<OpportunityFile[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_opportunity_files")
    .select("id, opportunity_id, file_name, storage_path, content_type, size_bytes, uploaded_at")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", OWNER_USER_ID)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOpportunityFile);
}

export async function uploadOpportunityFile(opportunityId: string, file: File): Promise<OpportunityFile> {
  const supabase = createAdminClient();
  const storagePath = `${OWNER_USER_ID}/${opportunityId}/${randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("crm_opportunity_files")
    .insert({
      user_id: OWNER_USER_ID,
      opportunity_id: opportunityId,
      file_name: file.name,
      storage_path: storagePath,
      content_type: file.type || null,
      size_bytes: file.size,
    })
    .select("id, opportunity_id, file_name, storage_path, content_type, size_bytes, uploaded_at")
    .single();
  if (error) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  return mapOpportunityFile(data);
}

export async function deleteOpportunityFile(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { data, error: fetchError } = await supabase
    .from("crm_opportunity_files")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!data) return;

  await supabase.storage.from(ATTACHMENTS_BUCKET).remove([data.storage_path as string]);

  const { error } = await supabase
    .from("crm_opportunity_files")
    .delete()
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function getOpportunityFileDownloadUrl(id: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error: fetchError } = await supabase
    .from("crm_opportunity_files")
    .select("storage_path, file_name")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!data) throw new Error("File not found.");

  const { data: signed, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(data.storage_path as string, 300, { download: data.file_name as string });
  if (error) throw new Error(error.message);
  return signed.signedUrl;
}

// ---------- Opportunity sites ----------
// A dedicated, per-opportunity site list (e.g. the properties covered by an
// RFP), separate from Procurement's shared datasets. Re-uploading replaces
// the whole list; crm_opportunities.site_count is kept in sync with the
// real row count so it stops being a manually-typed guess once real data
// exists.

export async function getOpportunitySiteBinding(opportunityId: string): Promise<OpportunitySiteBinding | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_opportunity_site_bindings")
    .select("lat_column, lng_column, label_column")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    latColumn: data.lat_column as string,
    lngColumn: data.lng_column as string,
    labelColumn: (data.label_column as string | null) ?? null,
  };
}

export async function saveOpportunitySiteBinding(opportunityId: string, binding: OpportunitySiteBinding): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_opportunity_site_bindings").upsert(
    {
      user_id: OWNER_USER_ID,
      opportunity_id: opportunityId,
      lat_column: binding.latColumn,
      lng_column: binding.lngColumn,
      label_column: binding.labelColumn,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "opportunity_id" },
  );
  if (error) throw new Error(error.message);
}

export async function listOpportunitySites(opportunityId: string): Promise<OpportunitySiteRow[]> {
  const supabase = createAdminClient();
  const pageSize = 1000;
  let from = 0;
  const rows: OpportunitySiteRow[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("crm_opportunity_sites")
      .select("id, data")
      .eq("opportunity_id", opportunityId)
      .eq("user_id", OWNER_USER_ID)
      .order("row_index", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as { id: number; data: DatasetRecord }[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

/** Fully replaces an opportunity's site list and syncs crm_opportunities.site_count to match. */
export async function replaceOpportunitySites(opportunityId: string, rows: DatasetRecord[]): Promise<void> {
  const supabase = createAdminClient();

  const { error: deleteError } = await supabase
    .from("crm_opportunity_sites")
    .delete()
    .eq("opportunity_id", opportunityId)
    .eq("user_id", OWNER_USER_ID);
  if (deleteError) throw new Error(deleteError.message);

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map((row, idx) => ({
      opportunity_id: opportunityId,
      user_id: OWNER_USER_ID,
      row_index: i + idx,
      data: row,
    }));
    const { error: insertError } = await supabase.from("crm_opportunity_sites").insert(batch);
    if (insertError) throw new Error(insertError.message);
  }

  const { error: countError } = await supabase
    .from("crm_opportunities")
    .update({ site_count: rows.length, updated_at: new Date().toISOString() })
    .eq("id", opportunityId)
    .eq("user_id", OWNER_USER_ID);
  if (countError) throw new Error(countError.message);
}

export async function updateOpportunitySiteFields(opportunityId: string, rowId: number, data: DatasetRecord): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_opportunity_sites")
    .update({ data })
    .eq("id", rowId)
    .eq("opportunity_id", opportunityId)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

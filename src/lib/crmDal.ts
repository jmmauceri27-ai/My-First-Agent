import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient, OWNER_USER_ID } from "./supabase/admin";
import type {
  ClientRateOverride,
  ClientRateOverrideInput,
  Company,
  CompanyImportRow,
  CompanyInput,
  Contact,
  ContactInput,
  Contract,
  ContractFile,
  ContractInput,
  Employee,
  EmployeeImportRow,
  EmployeeInput,
  Opportunity,
  OpportunityFile,
  OpportunityInput,
  OpportunityStage,
  RateItem,
  RateItemImportRow,
  RateItemInput,
} from "./crmTypes";

const ATTACHMENTS_BUCKET = "crm-attachments";

/** Common office/document extensions -> MIME type, used when the browser doesn't report one (e.g. some
 * Windows/Linux setups leave `File.type` empty for .xlsx uploads). Getting this right at upload time matters --
 * Supabase Storage serves whatever content-type was stored, and it can't be corrected later on download. */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function resolveContentType(file: File): string | undefined {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? CONTENT_TYPE_BY_EXTENSION[ext] : undefined;
}

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(CONTENT_TYPE_BY_EXTENSION).map(([ext, type]) => [type, ext]),
);

/** Appends the extension implied by `contentType` when `fileName` doesn't already end in one -- a safety net for
 * whatever occasionally strips the extension off `File.name` before it reaches here, so a saved attachment
 * always downloads with a name the OS/Office can recognize and open. */
function ensureFileNameExtension(fileName: string, contentType: string | undefined): string {
  if (/\.[a-z0-9]{2,5}$/i.test(fileName)) return fileName;
  const ext = contentType ? EXTENSION_BY_CONTENT_TYPE[contentType] : undefined;
  return ext ? `${fileName}.${ext}` : fileName;
}

/** Identifies a file's real type from its own bytes (magic numbers), for attachments whose stored content_type is
 * missing or unhelpful and whose name has no extension to fall back on. */
function sniffExtensionFromBytes(buf: Buffer): string | undefined {
  if (buf.length >= 4 && buf.subarray(0, 4).toString("latin1") === "%PDF") return "pdf";
  if (buf.length >= 8 && buf[0] === 0x89 && buf.subarray(1, 4).toString("latin1") === "PNG") return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return "xls"; // legacy OLE (.xls/.doc)
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
    // A zip-based Office document -- peek at its internal file listing to tell xlsx/docx/pptx apart.
    const text = buf.toString("latin1");
    if (text.includes("word/")) return "docx";
    if (text.includes("ppt/")) return "pptx";
    return "xlsx";
  }
  return undefined;
}

export interface FileExtensionFix {
  fileName: string;
  newFileName: string;
}

export interface FileExtensionFixResult {
  fixed: FileExtensionFix[];
  skipped: { fileName: string; reason: string }[];
}

/** Scans every Opportunity/Contract file attachment for one whose name is missing an extension (see
 * ensureFileNameExtension -- affects attachments uploaded before that safety net existed) and renames it in
 * place, inferring the right extension from content_type first and, failing that, the file's own bytes. */
export async function fixMissingFileExtensions(): Promise<FileExtensionFixResult> {
  const supabase = createAdminClient();
  const fixed: FileExtensionFix[] = [];
  const skipped: { fileName: string; reason: string }[] = [];

  for (const table of ["crm_contract_files", "crm_opportunity_files"] as const) {
    const { data, error } = await supabase
      .from(table)
      .select("id, file_name, storage_path, content_type")
      .eq("user_id", OWNER_USER_ID);
    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      const fileName = row.file_name as string;
      if (/\.[a-z0-9]{2,5}$/i.test(fileName)) continue;

      const contentType = row.content_type as string | null;
      let ext = contentType ? EXTENSION_BY_CONTENT_TYPE[contentType] : undefined;

      if (!ext) {
        const { data: blob, error: downloadError } = await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .download(row.storage_path as string);
        if (downloadError || !blob) {
          skipped.push({ fileName, reason: downloadError?.message ?? "Could not read the file to identify its type." });
          continue;
        }
        ext = sniffExtensionFromBytes(Buffer.from(await blob.arrayBuffer()));
      }

      if (!ext) {
        skipped.push({ fileName, reason: "Could not determine the file's type." });
        continue;
      }

      const newFileName = `${fileName}.${ext}`;
      const { error: updateError } = await supabase.from(table).update({ file_name: newFileName }).eq("id", row.id);
      if (updateError) {
        skipped.push({ fileName, reason: updateError.message });
        continue;
      }
      fixed.push({ fileName, newFileName });
    }
  }

  return { fixed, skipped };
}

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

export async function getCompany(id: string): Promise<Company | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_companies")
    .select("id, name, address, city, state, website, notes, created_at")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    address: data.address as string | null,
    city: data.city as string | null,
    state: data.state as string | null,
    website: data.website as string | null,
    notes: data.notes as string | null,
    createdAt: data.created_at as string,
  };
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

/** Bulk-imports uploaded sheet rows as new companies. Appends -- does not de-duplicate against existing companies. */
export async function bulkCreateCompanies(rows: CompanyImportRow[]): Promise<{ inserted: number }> {
  const supabase = createAdminClient();
  const batch = rows.map((row) => ({
    user_id: OWNER_USER_ID,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    website: row.website,
    notes: row.notes,
  }));

  const batchSize = 500;
  for (let i = 0; i < batch.length; i += batchSize) {
    const { error } = await supabase.from("crm_companies").insert(batch.slice(i, i + batchSize));
    if (error) throw new Error(error.message);
  }
  return { inserted: batch.length };
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

function mapEmployee(e: Record<string, unknown>): Employee {
  return {
    id: e.id as string,
    name: e.name as string,
    email: e.email as string | null,
    phone: e.phone as string | null,
    title: e.title as string | null,
    department: e.department as string | null,
    createdAt: e.created_at as string,
  };
}

export async function listEmployees(): Promise<Employee[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_employees")
    .select("id, name, email, phone, title, department, created_at")
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapEmployee);
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_employees")
    .select("id, name, email, phone, title, department, created_at")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapEmployee(data);
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

export async function createEmployeeWithDetails(input: EmployeeInput): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_employees")
    .insert({
      user_id: OWNER_USER_ID,
      name: input.name,
      email: input.email,
      phone: input.phone,
      title: input.title,
      department: input.department,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_employees")
    .update({
      name: input.name,
      email: input.email,
      phone: input.phone,
      title: input.title,
      department: input.department,
    })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function deleteEmployee(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_employees").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

/** Bulk-imports uploaded sheet rows as new employees. Appends -- does not de-duplicate against existing employees. */
export async function bulkCreateEmployees(rows: EmployeeImportRow[]): Promise<{ inserted: number }> {
  const supabase = createAdminClient();
  const batch = rows.map((row) => ({
    user_id: OWNER_USER_ID,
    name: row.name,
    email: row.email,
    phone: row.phone,
    title: row.title,
    department: row.department,
  }));

  const batchSize = 500;
  for (let i = 0; i < batch.length; i += batchSize) {
    const { error } = await supabase.from("crm_employees").insert(batch.slice(i, i + batchSize));
    if (error) throw new Error(error.message);
  }
  return { inserted: batch.length };
}

// ---------- Contracts ----------
// Existing signed contracts (as opposed to crm_opportunities, the open
// pipeline): a validity window, rate, site count, and type of work.

const CONTRACT_COLUMNS =
  "id, company_id, name, work_type, site_count, rate_amount, rate_frequency, billing_type, start_date, end_date, notes, created_at, updated_at, crm_companies(name)";

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
    billingType: c.billing_type as string | null,
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
      billing_type: input.billingType,
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
      billing_type: input.billingType,
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

// ---------- Contract file attachments ----------

function mapContractFile(f: Record<string, unknown>): ContractFile {
  return {
    id: f.id as string,
    contractId: f.contract_id as string,
    fileName: f.file_name as string,
    storagePath: f.storage_path as string,
    contentType: f.content_type as string | null,
    sizeBytes: Number(f.size_bytes),
    uploadedAt: f.uploaded_at as string,
  };
}

export async function listContractFiles(contractId: string): Promise<ContractFile[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_contract_files")
    .select("id, contract_id, file_name, storage_path, content_type, size_bytes, uploaded_at")
    .eq("contract_id", contractId)
    .eq("user_id", OWNER_USER_ID)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapContractFile);
}

export async function uploadContractFile(contractId: string, file: File): Promise<ContractFile> {
  const supabase = createAdminClient();
  const contentType = resolveContentType(file);
  const fileName = ensureFileNameExtension(file.name, contentType);
  const storagePath = `${OWNER_USER_ID}/contracts/${contractId}/${randomUUID()}-${fileName}`;

  const { error: uploadError } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(storagePath, file, { contentType });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("crm_contract_files")
    .insert({
      user_id: OWNER_USER_ID,
      contract_id: contractId,
      file_name: fileName,
      storage_path: storagePath,
      content_type: contentType ?? null,
      size_bytes: file.size,
    })
    .select("id, contract_id, file_name, storage_path, content_type, size_bytes, uploaded_at")
    .single();
  if (error) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  return mapContractFile(data);
}

export async function renameContractFile(id: string, fileName: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_contract_files")
    .update({ file_name: fileName })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function deleteContractFile(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { data, error: fetchError } = await supabase
    .from("crm_contract_files")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!data) return;

  await supabase.storage.from(ATTACHMENTS_BUCKET).remove([data.storage_path as string]);

  const { error } = await supabase
    .from("crm_contract_files")
    .delete()
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function getContractFileDownloadUrl(id: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error: fetchError } = await supabase
    .from("crm_contract_files")
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
  const contentType = resolveContentType(file);
  const fileName = ensureFileNameExtension(file.name, contentType);
  const storagePath = `${OWNER_USER_ID}/${opportunityId}/${randomUUID()}-${fileName}`;

  const { error: uploadError } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(storagePath, file, { contentType });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("crm_opportunity_files")
    .insert({
      user_id: OWNER_USER_ID,
      opportunity_id: opportunityId,
      file_name: fileName,
      storage_path: storagePath,
      content_type: contentType ?? null,
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

export async function renameOpportunityFile(id: string, fileName: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_opportunity_files")
    .update({ file_name: fileName })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
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

// ---------- Rate Items ----------
// Step 1 of the AI proposal builder: a per-trade line-item catalog (labor, equipment, materials, flat-rate
// service tasks) -- a trade's proposal price is composed from these, not a single base rate.

const RATE_ITEM_COLUMNS =
  "id, trade, category, item_name, pricing_basis, rate_tier, rate, unit_label, notes, created_at, updated_at";

function mapRateItem(r: Record<string, unknown>): RateItem {
  return {
    id: r.id as string,
    trade: r.trade as string,
    category: r.category as string,
    itemName: r.item_name as string,
    pricingBasis: r.pricing_basis as string,
    rateTier: r.rate_tier as string,
    rate: r.rate as number,
    unitLabel: r.unit_label as string | null,
    notes: r.notes as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function listRateItems(): Promise<RateItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rate_items")
    .select(RATE_ITEM_COLUMNS)
    .eq("user_id", OWNER_USER_ID)
    .order("trade", { ascending: true })
    .order("category", { ascending: true })
    .order("item_name", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapRateItem);
}

export async function createRateItem(input: RateItemInput): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rate_items")
    .insert({
      user_id: OWNER_USER_ID,
      trade: input.trade,
      category: input.category,
      item_name: input.itemName,
      pricing_basis: input.pricingBasis,
      rate_tier: input.rateTier,
      rate: input.rate,
      unit_label: input.unitLabel,
      notes: input.notes,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateRateItem(id: string, input: RateItemInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("rate_items")
    .update({
      trade: input.trade,
      category: input.category,
      item_name: input.itemName,
      pricing_basis: input.pricingBasis,
      rate_tier: input.rateTier,
      rate: input.rate,
      unit_label: input.unitLabel,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function deleteRateItem(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("rate_items").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function bulkCreateRateItems(rows: RateItemImportRow[]): Promise<{ inserted: number }> {
  if (rows.length === 0) return { inserted: 0 };
  const supabase = createAdminClient();
  const { error } = await supabase.from("rate_items").insert(
    rows.map((r) => ({
      user_id: OWNER_USER_ID,
      trade: r.trade,
      category: r.category,
      item_name: r.itemName,
      pricing_basis: r.pricingBasis,
      rate_tier: r.rateTier,
      rate: r.rate,
      unit_label: r.unitLabel,
      notes: r.notes,
    })),
  );
  if (error) throw new Error(error.message);
  return { inserted: rows.length };
}

// ---------- Client Rate Overrides ----------
// A specific client's blanket discount/markup on one trade's computed total (the sum of its rate_items).

const CLIENT_RATE_OVERRIDE_COLUMNS =
  "id, company_id, trade, override_type, override_value, notes, created_at, updated_at, crm_companies(name)";

function mapClientRateOverride(o: Record<string, unknown>): ClientRateOverride {
  const company = o.crm_companies as unknown as { name: string } | null;
  return {
    id: o.id as string,
    companyId: o.company_id as string,
    companyName: company?.name ?? null,
    trade: o.trade as string,
    overrideType: o.override_type as string,
    overrideValue: o.override_value as number,
    notes: o.notes as string | null,
    createdAt: o.created_at as string,
    updatedAt: o.updated_at as string,
  };
}

export async function listClientRateOverrides(): Promise<ClientRateOverride[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_rate_overrides")
    .select(CLIENT_RATE_OVERRIDE_COLUMNS)
    .eq("user_id", OWNER_USER_ID)
    .order("trade", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapClientRateOverride);
}

export async function createClientRateOverride(input: ClientRateOverrideInput): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_rate_overrides")
    .insert({
      user_id: OWNER_USER_ID,
      company_id: input.companyId,
      trade: input.trade,
      override_type: input.overrideType,
      override_value: input.overrideValue,
      notes: input.notes,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateClientRateOverride(id: string, input: ClientRateOverrideInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("client_rate_overrides")
    .update({
      company_id: input.companyId,
      trade: input.trade,
      override_type: input.overrideType,
      override_value: input.overrideValue,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function deleteClientRateOverride(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("client_rate_overrides").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient, OWNER_USER_ID } from "./supabase/admin";
import type {
  Company,
  CompanyInput,
  Contact,
  ContactInput,
  Opportunity,
  OpportunityFile,
  OpportunityInput,
  OpportunityStage,
} from "./crmTypes";

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

// ---------- Opportunities ----------

export async function listOpportunities(): Promise<Opportunity[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_opportunities")
    .select(
      "id, name, company_id, stage, amount, site_count, work_type, expected_close_date, notes, position, created_at, updated_at, crm_companies(name), crm_opportunity_contacts(contact_id)",
    )
    .eq("user_id", OWNER_USER_ID)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((o) => {
    const company = o.crm_companies as unknown as { name: string } | null;
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
      position: o.position as number,
      createdAt: o.created_at as string,
      updatedAt: o.updated_at as string,
    };
  });
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_opportunities")
    .select(
      "id, name, company_id, stage, amount, site_count, work_type, expected_close_date, notes, position, created_at, updated_at, crm_companies(name), crm_opportunity_contacts(contact_id)",
    )
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const company = data.crm_companies as unknown as { name: string } | null;
  const contactRows = (data.crm_opportunity_contacts ?? []) as unknown as { contact_id: string }[];
  return {
    id: data.id as string,
    name: data.name as string,
    companyId: data.company_id as string | null,
    companyName: company?.name ?? null,
    stage: data.stage as OpportunityStage,
    amount: data.amount as number | null,
    siteCount: data.site_count as number | null,
    workType: data.work_type as string | null,
    expectedCloseDate: data.expected_close_date as string | null,
    notes: data.notes as string | null,
    contactIds: contactRows.map((r) => r.contact_id),
    position: data.position as number,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
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

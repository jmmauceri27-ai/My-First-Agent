"use server";

import { revalidatePath } from "next/cache";
import {
  createCompany,
  createContact,
  createContract,
  createEmployee,
  createOpportunity,
  deleteCompany,
  deleteContact,
  deleteContract,
  deleteEmployee,
  deleteOpportunity,
  deleteOpportunityFile,
  getOpportunityFileDownloadUrl,
  getOpportunitySiteBinding,
  listCompanies,
  listContacts,
  listEmployees,
  listOpportunitySites,
  replaceOpportunitySites,
  saveOpportunitySiteBinding,
  updateCompany,
  updateContact,
  updateContract,
  updateOpportunity,
  updateOpportunitySiteFields,
  updateOpportunityStage,
  uploadOpportunityFile,
} from "@/lib/crmDal";
import type {
  Company,
  CompanyInput,
  Contact,
  ContactInput,
  ContractInput,
  Employee,
  OpportunityInput,
  OpportunitySiteBinding,
  OpportunitySiteRow,
  OpportunityStage,
} from "@/lib/crmTypes";
import type { DatasetRecord } from "@/lib/types";
import { parseBuffer } from "@/lib/parse";

export async function saveOpportunityAction(id: string | null, input: OpportunityInput): Promise<void> {
  if (id) {
    await updateOpportunity(id, input);
  } else {
    await createOpportunity(input);
  }
  revalidatePath("/crm");
}

export async function moveOpportunityStageAction(id: string, stage: OpportunityStage): Promise<void> {
  await updateOpportunityStage(id, stage);
  revalidatePath("/crm");
}

export async function deleteOpportunityAction(id: string): Promise<void> {
  await deleteOpportunity(id);
  revalidatePath("/crm");
}

export async function saveCompanyAction(id: string | null, input: CompanyInput): Promise<string> {
  let companyId: string;
  if (id) {
    await updateCompany(id, input);
    companyId = id;
  } else {
    companyId = await createCompany(input);
  }
  revalidatePath("/crm");
  revalidatePath("/crm/companies");
  return companyId;
}

export async function deleteCompanyAction(id: string): Promise<void> {
  await deleteCompany(id);
  revalidatePath("/crm");
  revalidatePath("/crm/companies");
}

export async function saveContactAction(id: string | null, input: ContactInput): Promise<string> {
  let contactId: string;
  if (id) {
    await updateContact(id, input);
    contactId = id;
  } else {
    contactId = await createContact(input);
  }
  revalidatePath("/crm");
  revalidatePath("/crm/contacts");
  return contactId;
}

export async function deleteContactAction(id: string): Promise<void> {
  await deleteContact(id);
  revalidatePath("/crm");
  revalidatePath("/crm/contacts");
}

export async function saveContractAction(id: string | null, input: ContractInput): Promise<string> {
  let contractId: string;
  if (id) {
    await updateContract(id, input);
    contractId = id;
  } else {
    contractId = await createContract(input);
  }
  revalidatePath("/crm");
  revalidatePath("/crm/contracts");
  return contractId;
}

export async function deleteContractAction(id: string): Promise<void> {
  await deleteContract(id);
  revalidatePath("/crm");
  revalidatePath("/crm/contracts");
}

export async function listCompaniesAction(): Promise<Company[]> {
  return listCompanies();
}

export async function listContactsAction(): Promise<Contact[]> {
  return listContacts();
}

export async function listEmployeesAction(): Promise<Employee[]> {
  return listEmployees();
}

export async function saveEmployeeAction(name: string): Promise<string> {
  const id = await createEmployee(name);
  revalidatePath("/crm");
  return id;
}

export async function deleteEmployeeAction(id: string): Promise<void> {
  await deleteEmployee(id);
  revalidatePath("/crm");
}

export async function uploadOpportunityFileAction(opportunityId: string, formData: FormData): Promise<void> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a file.");
  }
  await uploadOpportunityFile(opportunityId, file);
  revalidatePath(`/crm/opportunities/${opportunityId}`);
}

export async function deleteOpportunityFileAction(id: string, opportunityId: string): Promise<void> {
  await deleteOpportunityFile(id);
  revalidatePath(`/crm/opportunities/${opportunityId}`);
}

export async function getOpportunityFileDownloadUrlAction(id: string): Promise<string> {
  return getOpportunityFileDownloadUrl(id);
}

export async function getOpportunitySiteBindingAction(opportunityId: string): Promise<OpportunitySiteBinding | null> {
  return getOpportunitySiteBinding(opportunityId);
}

export async function saveOpportunitySiteBindingAction(
  opportunityId: string,
  binding: OpportunitySiteBinding,
): Promise<void> {
  await saveOpportunitySiteBinding(opportunityId, binding);
  revalidatePath(`/crm/opportunities/${opportunityId}`);
}

export async function fetchOpportunitySitesAction(opportunityId: string): Promise<OpportunitySiteRow[]> {
  return listOpportunitySites(opportunityId);
}

export async function updateOpportunitySiteRowAction(
  opportunityId: string,
  rowId: number,
  data: DatasetRecord,
): Promise<void> {
  await updateOpportunitySiteFields(opportunityId, rowId, data);
  revalidatePath(`/crm/opportunities/${opportunityId}`);
}

export async function uploadOpportunitySitesAction(
  opportunityId: string,
  formData: FormData,
): Promise<{ error?: string }> {
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
    await replaceOpportunitySites(opportunityId, rows);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to upload sites." };
  }
  revalidatePath(`/crm/opportunities/${opportunityId}`);
  revalidatePath("/crm");
  return {};
}

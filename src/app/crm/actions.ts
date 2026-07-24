"use server";

import { revalidatePath } from "next/cache";
import {
  createCompany,
  createContact,
  createEmployee,
  createOpportunity,
  deleteCompany,
  deleteContact,
  deleteEmployee,
  deleteOpportunity,
  deleteOpportunityFile,
  getOpportunityFileDownloadUrl,
  listCompanies,
  listContacts,
  listEmployees,
  updateCompany,
  updateContact,
  updateOpportunity,
  updateOpportunityStage,
  uploadOpportunityFile,
} from "@/lib/crmDal";
import type {
  Company,
  CompanyInput,
  Contact,
  ContactInput,
  Employee,
  OpportunityInput,
  OpportunityStage,
} from "@/lib/crmTypes";

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

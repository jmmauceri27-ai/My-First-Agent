"use server";

import { revalidatePath } from "next/cache";
import {
  createCompany,
  createContact,
  createOpportunity,
  deleteCompany,
  deleteContact,
  deleteOpportunity,
  listCompanies,
  listContacts,
  updateCompany,
  updateContact,
  updateOpportunity,
  updateOpportunityStage,
} from "@/lib/crmDal";
import type {
  Company,
  CompanyInput,
  Contact,
  ContactInput,
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

"use server";

import { revalidatePath } from "next/cache";
import {
  createCompany,
  createContact,
  createContract,
  createEmployee,
  createEmployeeWithDetails,
  createOpportunity,
  deleteCompany,
  deleteContact,
  deleteContract,
  deleteContractFile,
  deleteEmployee,
  deleteOpportunity,
  deleteOpportunityFile,
  getCompany,
  getContractFileDownloadUrl,
  getEmployee,
  getOpportunityFileDownloadUrl,
  listCompanies,
  listContacts,
  listContractFiles,
  listEmployees,
  renameContractFile,
  renameOpportunityFile,
  updateCompany,
  updateContact,
  updateContract,
  updateEmployee,
  updateOpportunity,
  updateOpportunityStage,
  uploadContractFile,
  uploadOpportunityFile,
} from "@/lib/crmDal";
import type {
  Company,
  CompanyInput,
  Contact,
  ContactInput,
  ContractFile,
  ContractInput,
  Employee,
  EmployeeInput,
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

export async function listContractFilesAction(contractId: string): Promise<ContractFile[]> {
  return listContractFiles(contractId);
}

export async function uploadContractFileAction(
  contractId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }
  try {
    await uploadContractFile(contractId, file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to upload file." };
  }
  revalidatePath("/crm/contracts");
  return {};
}

export async function deleteContractFileAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteContractFile(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete file." };
  }
  revalidatePath("/crm/contracts");
  return {};
}

export async function renameContractFileAction(id: string, fileName: string): Promise<{ error?: string }> {
  try {
    await renameContractFile(id, fileName);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to rename file." };
  }
  revalidatePath("/crm/contracts");
  return {};
}

export async function getContractFileDownloadUrlAction(id: string): Promise<{ url?: string; error?: string }> {
  try {
    return { url: await getContractFileDownloadUrl(id) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to open file." };
  }
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
  revalidatePath("/network/employees");
}

export async function createEmployeeWithDetailsAction(input: EmployeeInput): Promise<{ id?: string; error?: string }> {
  try {
    const id = await createEmployeeWithDetails(input);
    revalidatePath("/crm");
    revalidatePath("/network/employees");
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create employee." };
  }
}

export async function uploadOpportunityFileAction(
  opportunityId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }
  try {
    await uploadOpportunityFile(opportunityId, file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to upload file." };
  }
  revalidatePath(`/crm/opportunities/${opportunityId}`);
  return {};
}

export async function deleteOpportunityFileAction(
  id: string,
  opportunityId: string,
): Promise<{ error?: string }> {
  try {
    await deleteOpportunityFile(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete file." };
  }
  revalidatePath(`/crm/opportunities/${opportunityId}`);
  return {};
}

export async function getOpportunityFileDownloadUrlAction(id: string): Promise<{ url?: string; error?: string }> {
  try {
    return { url: await getOpportunityFileDownloadUrl(id) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to open file." };
  }
}

export async function renameOpportunityFileAction(
  id: string,
  opportunityId: string,
  fileName: string,
): Promise<{ error?: string }> {
  try {
    await renameOpportunityFile(id, fileName);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to rename file." };
  }
  revalidatePath(`/crm/opportunities/${opportunityId}`);
  return {};
}

export async function getCompanyAction(id: string): Promise<Company | null> {
  return getCompany(id);
}

export async function getEmployeeAction(id: string): Promise<Employee | null> {
  return getEmployee(id);
}

export async function updateEmployeeAction(id: string, input: EmployeeInput): Promise<void> {
  await updateEmployee(id, input);
  revalidatePath("/crm");
  revalidatePath(`/network/employees/${id}`);
}

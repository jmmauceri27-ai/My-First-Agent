"use server";

import { revalidatePath } from "next/cache";
import {
  assignFieldToRecord,
  createField,
  createFieldClass,
  deleteField,
  deleteFieldClass,
  getFieldValuesForRecord,
  listAssignedFieldIds,
  saveFieldValuesForRecord,
  unassignFieldFromRecord,
  updateField,
  updateFieldClass,
} from "@/lib/fieldsDal";
import type { CrmFieldInput, FieldClassInput } from "@/lib/crmTypes";

export async function createFieldClassAction(input: FieldClassInput): Promise<{ id?: string; error?: string }> {
  try {
    const id = await createFieldClass(input);
    revalidatePath("/crm/fields");
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create class." };
  }
}

export async function updateFieldClassAction(id: string, name: string): Promise<{ error?: string }> {
  try {
    await updateFieldClass(id, name);
    revalidatePath("/crm/fields");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update class." };
  }
}

export async function deleteFieldClassAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteFieldClass(id);
    revalidatePath("/crm/fields");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete class." };
  }
}

export async function createFieldAction(input: CrmFieldInput): Promise<{ id?: string; error?: string }> {
  try {
    const id = await createField(input);
    revalidatePath("/crm/fields");
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create field." };
  }
}

export async function updateFieldAction(id: string, input: CrmFieldInput): Promise<{ error?: string }> {
  try {
    await updateField(id, input);
    revalidatePath("/crm/fields");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update field." };
  }
}

export async function deleteFieldAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteField(id);
    revalidatePath("/crm/fields");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete field." };
  }
}

export async function getFieldValuesForRecordAction(recordId: string): Promise<Record<string, string | null>> {
  return getFieldValuesForRecord(recordId);
}

export async function saveFieldValuesForRecordAction(
  recordId: string,
  values: { fieldId: string; value: string | null }[],
): Promise<{ error?: string }> {
  try {
    await saveFieldValuesForRecord(recordId, values);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save field values." };
  }
}

export async function listAssignedFieldIdsAction(recordId: string): Promise<string[]> {
  return listAssignedFieldIds(recordId);
}

export async function assignFieldToRecordAction(recordId: string, fieldId: string): Promise<{ error?: string }> {
  try {
    await assignFieldToRecord(recordId, fieldId);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add field." };
  }
}

export async function unassignFieldFromRecordAction(recordId: string, fieldId: string): Promise<{ error?: string }> {
  try {
    await unassignFieldFromRecord(recordId, fieldId);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to remove field." };
  }
}

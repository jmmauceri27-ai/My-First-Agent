import "server-only";
import { createAdminClient, OWNER_USER_ID } from "./supabase/admin";
import type { CrmField, CrmFieldInput, FieldClass, FieldClassInput } from "./crmTypes";

// ---------- Field Classes ----------

const FIELD_CLASS_COLUMNS = "id, object_type, name, position, created_at, updated_at";

function mapFieldClass(c: Record<string, unknown>): Omit<FieldClass, "fields"> {
  return {
    id: c.id as string,
    objectType: c.object_type as string,
    name: c.name as string,
    position: c.position as number,
    createdAt: c.created_at as string,
    updatedAt: c.updated_at as string,
  };
}

const FIELD_COLUMNS = "id, object_type, class_id, name, label, field_type, options, position, created_at, updated_at";

function mapField(f: Record<string, unknown>): CrmField {
  return {
    id: f.id as string,
    objectType: f.object_type as string,
    classId: f.class_id as string,
    name: f.name as string,
    label: f.label as string,
    fieldType: f.field_type as string,
    options: (f.options as string[] | null) ?? null,
    position: f.position as number,
    createdAt: f.created_at as string,
    updatedAt: f.updated_at as string,
  };
}

/** Every class for `objectType`, each with its fields nested and both ordered by position. */
export async function listFieldClasses(objectType: string): Promise<FieldClass[]> {
  const supabase = createAdminClient();
  const [{ data: classRows, error: classError }, { data: fieldRows, error: fieldError }] = await Promise.all([
    supabase
      .from("crm_field_classes")
      .select(FIELD_CLASS_COLUMNS)
      .eq("user_id", OWNER_USER_ID)
      .eq("object_type", objectType)
      .order("position", { ascending: true }),
    supabase
      .from("crm_fields")
      .select(FIELD_COLUMNS)
      .eq("user_id", OWNER_USER_ID)
      .eq("object_type", objectType)
      .order("position", { ascending: true }),
  ]);
  if (classError) throw new Error(classError.message);
  if (fieldError) throw new Error(fieldError.message);

  const fieldsByClass = new Map<string, CrmField[]>();
  for (const row of fieldRows ?? []) {
    const field = mapField(row);
    if (!fieldsByClass.has(field.classId)) fieldsByClass.set(field.classId, []);
    fieldsByClass.get(field.classId)!.push(field);
  }

  return (classRows ?? []).map((row) => {
    const fieldClass = mapFieldClass(row);
    return { ...fieldClass, fields: fieldsByClass.get(fieldClass.id) ?? [] };
  });
}

export async function createFieldClass(input: FieldClassInput): Promise<string> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("crm_field_classes")
    .select("position")
    .eq("user_id", OWNER_USER_ID)
    .eq("object_type", input.objectType)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0;

  const { data, error } = await supabase
    .from("crm_field_classes")
    .insert({ user_id: OWNER_USER_ID, object_type: input.objectType, name: input.name, position: nextPosition })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateFieldClass(id: string, name: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_field_classes")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

/** Deleting a class cascades to its fields (crm_fields.class_id on delete cascade), which in turn cascades to
 * every stored value for those fields -- so this permanently discards every record's data for them. */
export async function deleteFieldClass(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_field_classes").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

// ---------- Fields ----------

/** Turns a label into a stable internal key, e.g. "Phone Number" -> "phone_number". */
function slugify(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "field";
}

export async function createField(input: CrmFieldInput): Promise<string> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("crm_fields")
    .select("position")
    .eq("user_id", OWNER_USER_ID)
    .eq("object_type", input.objectType)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0;

  const { data, error } = await supabase
    .from("crm_fields")
    .insert({
      user_id: OWNER_USER_ID,
      object_type: input.objectType,
      class_id: input.classId,
      name: slugify(input.label),
      label: input.label,
      field_type: input.fieldType,
      options: input.options,
      position: nextPosition,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("A field with a similar name already exists for this object type -- try a different label.");
    }
    throw new Error(error.message);
  }
  return data.id as string;
}

export async function updateField(id: string, input: CrmFieldInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_fields")
    .update({
      class_id: input.classId,
      label: input.label,
      field_type: input.fieldType,
      options: input.options,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

/** Deleting a field cascades to every record's stored value for it (crm_field_values.field_id on delete
 * cascade). */
export async function deleteField(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_fields").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

// ---------- Field Values ----------

/** This record's stored value for every field it has one for, keyed by fieldId. Fields with no value saved
 * yet for this record simply won't appear as a key. */
export async function getFieldValuesForRecord(recordId: string): Promise<Record<string, string | null>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_field_values")
    .select("field_id, value")
    .eq("user_id", OWNER_USER_ID)
    .eq("record_id", recordId);
  if (error) throw new Error(error.message);

  const result: Record<string, string | null> = {};
  for (const row of data ?? []) {
    result[row.field_id as string] = row.value as string | null;
  }
  return result;
}

/** Upserts each given value for `recordId`; a blank/null value deletes that field's row for this record
 * instead of storing an empty one, so an unset field simply doesn't appear in getFieldValuesForRecord. */
export async function saveFieldValuesForRecord(
  recordId: string,
  values: { fieldId: string; value: string | null }[],
): Promise<void> {
  const supabase = createAdminClient();

  const toUpsert = values.filter((v) => v.value != null && v.value !== "");
  const toDelete = values.filter((v) => v.value == null || v.value === "").map((v) => v.fieldId);

  if (toUpsert.length > 0) {
    const { error } = await supabase.from("crm_field_values").upsert(
      toUpsert.map((v) => ({
        user_id: OWNER_USER_ID,
        field_id: v.fieldId,
        record_id: recordId,
        value: v.value,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "field_id,record_id" },
    );
    if (error) throw new Error(error.message);
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("crm_field_values")
      .delete()
      .eq("user_id", OWNER_USER_ID)
      .eq("record_id", recordId)
      .in("field_id", toDelete);
    if (error) throw new Error(error.message);
  }
}

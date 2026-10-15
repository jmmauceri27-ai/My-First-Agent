import "server-only";
import { createAdminClient, OWNER_USER_ID } from "./supabase/admin";
import { chunkArray, SITE_ID_CHUNK_SIZE } from "./chunk";
import { RECORD_TYPES } from "./crmTypes";
import type { CrmField, CrmFieldInput, FieldClass, FieldClassInput } from "./crmTypes";

// ---------- Field Classes ----------

const FIELD_CLASS_COLUMNS = "id, name, record_type, position, created_at, updated_at";

function mapFieldClass(c: Record<string, unknown>): Omit<FieldClass, "fields"> {
  return {
    id: c.id as string,
    name: c.name as string,
    recordType: c.record_type as string,
    position: c.position as number,
    createdAt: c.created_at as string,
    updatedAt: c.updated_at as string,
  };
}

const FIELD_COLUMNS =
  "id, class_id, name, label, field_type, options, record_type, position, created_at, updated_at";

function mapField(f: Record<string, unknown>): CrmField {
  return {
    id: f.id as string,
    classId: f.class_id as string,
    name: f.name as string,
    label: f.label as string,
    fieldType: f.field_type as string,
    options: (f.options as string[] | null) ?? null,
    recordType: f.record_type as string,
    position: f.position as number,
    createdAt: f.created_at as string,
    updatedAt: f.updated_at as string,
  };
}

/** Every class, each with its fields nested and both ordered by position -- classes/fields aren't scoped to
 * a record type, so this is the full set usable anywhere. */
export async function listFieldClasses(): Promise<FieldClass[]> {
  const supabase = createAdminClient();
  const [{ data: classRows, error: classError }, { data: fieldRows, error: fieldError }] = await Promise.all([
    supabase
      .from("crm_field_classes")
      .select(FIELD_CLASS_COLUMNS)
      .eq("user_id", OWNER_USER_ID)
      .order("position", { ascending: true }),
    supabase
      .from("crm_fields")
      .select(FIELD_COLUMNS)
      .eq("user_id", OWNER_USER_ID)
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
  if (!(RECORD_TYPES as readonly string[]).includes(input.recordType)) {
    throw new Error(`"${input.recordType}" isn't a valid record type.`);
  }
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("crm_field_classes")
    .select("position")
    .eq("user_id", OWNER_USER_ID)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0;

  const { data, error } = await supabase
    .from("crm_field_classes")
    .insert({ user_id: OWNER_USER_ID, name: input.name, record_type: input.recordType, position: nextPosition })
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

/** A field's record_type always matches its class's -- fetched here rather than trusted from the caller,
 * since the class a field belongs to is the only thing that actually determines its record type. */
async function recordTypeForClass(classId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_field_classes")
    .select("record_type")
    .eq("id", classId)
    .eq("user_id", OWNER_USER_ID)
    .single();
  if (error) throw new Error(error.message);
  return data.record_type as string;
}

export async function createField(input: CrmFieldInput): Promise<string> {
  const supabase = createAdminClient();
  const [{ data: existing }, recordType] = await Promise.all([
    supabase
      .from("crm_fields")
      .select("position")
      .eq("user_id", OWNER_USER_ID)
      .order("position", { ascending: false })
      .limit(1),
    recordTypeForClass(input.classId),
  ]);
  const nextPosition = existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0;

  const { data, error } = await supabase
    .from("crm_fields")
    .insert({
      user_id: OWNER_USER_ID,
      class_id: input.classId,
      name: slugify(input.label),
      label: input.label,
      field_type: input.fieldType,
      options: input.options,
      record_type: recordType,
      position: nextPosition,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("A field with a similar name already exists on this record type -- try a different label.");
    }
    throw new Error(error.message);
  }
  return data.id as string;
}

export async function updateField(id: string, input: CrmFieldInput): Promise<void> {
  const supabase = createAdminClient();
  const [{ data: existingField, error: fetchError }, newRecordType] = await Promise.all([
    supabase.from("crm_fields").select("record_type").eq("id", id).eq("user_id", OWNER_USER_ID).single(),
    recordTypeForClass(input.classId),
  ]);
  if (fetchError) throw new Error(fetchError.message);
  if ((existingField.record_type as string) !== newRecordType) {
    throw new Error("A field can't be moved to a class of a different record type.");
  }

  const { error } = await supabase
    .from("crm_fields")
    .update({
      class_id: input.classId,
      label: input.label,
      field_type: input.fieldType,
      options: input.options,
      record_type: newRecordType,
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

/** Same as getFieldValuesForRecord, for many records at once -- e.g. exporting a batch of sites, each with
 * its own Measurements/Counts/Custom Field values. Chunked to stay under the .in(...) URL-length limit (see
 * chunkArray's own note). */
export async function getFieldValuesForRecords(recordIds: string[]): Promise<Record<string, Record<string, string | null>>> {
  if (recordIds.length === 0) return {};
  const supabase = createAdminClient();
  const result: Record<string, Record<string, string | null>> = {};
  for (const chunk of chunkArray(recordIds, SITE_ID_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("crm_field_values")
      .select("field_id, record_id, value")
      .eq("user_id", OWNER_USER_ID)
      .in("record_id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const recordId = row.record_id as string;
      if (!result[recordId]) result[recordId] = {};
      result[recordId][row.field_id as string] = row.value as string | null;
    }
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


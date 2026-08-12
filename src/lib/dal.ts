import "server-only";
import { createAdminClient, OWNER_USER_ID } from "./supabase/admin";
import type { DashboardConfig, DatasetRecord, DatasetSummary } from "./types";

// ---------- Upload chunk staging ----------
// Temporary scratch space for large file uploads (see supabase/005_upload_chunks.sql).
// Not a real dataset store -- rows are deleted once the upload is reassembled.

export async function insertUploadChunk(uploadId: string, chunkIndex: number, base64Data: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("upload_chunks")
    .insert({ user_id: OWNER_USER_ID, upload_id: uploadId, chunk_index: chunkIndex, data: base64Data });
  if (error) throw new Error(error.message);
}

export async function getUploadChunks(uploadId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("upload_chunks")
    .select("chunk_index, data")
    .eq("upload_id", uploadId)
    .eq("user_id", OWNER_USER_ID)
    .order("chunk_index", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.data as string);
}

export async function deleteUploadChunks(uploadId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("upload_chunks")
    .delete()
    .eq("upload_id", uploadId)
    .eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

/** Best-effort cleanup of chunks left behind by abandoned uploads (closed tab, etc.). */
export async function deleteStaleUploadChunks(): Promise<void> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await supabase.from("upload_chunks").delete().eq("user_id", OWNER_USER_ID).lt("created_at", cutoff);
}

export async function listDatasets(): Promise<DatasetSummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("datasets")
    .select("id, display_name, category, source_filename, row_count, columns, uploaded_at")
    .eq("user_id", OWNER_USER_ID)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((d) => ({
    id: d.id as string,
    displayName: d.display_name as string,
    category: d.category as string,
    sourceFilename: d.source_filename as string | null,
    rowCount: d.row_count as number,
    columns: (d.columns as string[]) ?? [],
    uploadedAt: d.uploaded_at as string,
  }));
}

export async function getDataset(id: string): Promise<DatasetSummary | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("datasets")
    .select("id, display_name, category, source_filename, row_count, columns, uploaded_at")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id as string,
    displayName: data.display_name as string,
    category: data.category as string,
    sourceFilename: data.source_filename as string | null,
    rowCount: data.row_count as number,
    columns: (data.columns as string[]) ?? [],
    uploadedAt: data.uploaded_at as string,
  };
}

export async function getDatasetRows(id: string): Promise<DatasetRecord[]> {
  const supabase = createAdminClient();
  const pageSize = 1000;
  let from = 0;
  const rows: DatasetRecord[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("dataset_rows")
      .select("data")
      .eq("dataset_id", id)
      .eq("user_id", OWNER_USER_ID)
      .order("row_index", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data.map((r) => r.data as DatasetRecord));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function ingestDataset(
  displayName: string,
  category: string,
  sourceFilename: string,
  rows: DatasetRecord[],
): Promise<string> {
  const supabase = createAdminClient();
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const { data: dataset, error: upsertError } = await supabase
    .from("datasets")
    .upsert(
      {
        user_id: OWNER_USER_ID,
        display_name: displayName,
        category,
        source_filename: sourceFilename,
        row_count: rows.length,
        columns,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: "user_id,display_name" },
    )
    .select("id")
    .single();
  if (upsertError) throw new Error(upsertError.message);

  const datasetId = dataset.id as string;

  const { error: deleteError } = await supabase
    .from("dataset_rows")
    .delete()
    .eq("dataset_id", datasetId)
    .eq("user_id", OWNER_USER_ID);
  if (deleteError) throw new Error(deleteError.message);

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map((row, idx) => ({
      dataset_id: datasetId,
      user_id: OWNER_USER_ID,
      row_index: i + idx,
      data: row,
    }));
    const { error: insertError } = await supabase.from("dataset_rows").insert(batch);
    if (insertError) throw new Error(insertError.message);
  }

  return datasetId;
}

export interface MergeResult {
  inserted: number;
  updated: number;
  totalRows: number;
}

/**
 * Upserts rows into an existing dataset by matching on `keyColumn`: rows whose
 * key matches an existing row have the upload's fields merged onto it (new
 * values win, but existing fields the upload doesn't include -- e.g. lat/lng
 * from a location sheet when merging in a rates sheet -- are preserved), and
 * everything else is inserted. Rows already in the dataset that aren't
 * present in this upload are left untouched (unlike ingestDataset's full
 * replace).
 */
export async function mergeDataset(
  datasetId: string,
  keyColumn: string,
  sourceFilename: string,
  rows: DatasetRecord[],
): Promise<MergeResult> {
  const supabase = createAdminClient();

  const existing: { id: number; data: DatasetRecord }[] = [];
  {
    const pageSize = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("dataset_rows")
        .select("id, data")
        .eq("dataset_id", datasetId)
        .eq("user_id", OWNER_USER_ID)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;
      existing.push(...(data as { id: number; data: DatasetRecord }[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  const existingIdByKey = new Map<string, number>();
  const existingDataById = new Map<number, DatasetRecord>();
  for (const row of existing) {
    existingDataById.set(row.id, row.data);
    const keyValue = row.data[keyColumn];
    if (keyValue === null || keyValue === undefined || keyValue === "") continue;
    existingIdByKey.set(String(keyValue), row.id);
  }

  const updates: { id: number; row: DatasetRecord }[] = [];
  const toInsert: DatasetRecord[] = [];

  for (const row of rows) {
    const keyValue = row[keyColumn];
    const existingId =
      keyValue === null || keyValue === undefined || keyValue === ""
        ? undefined
        : existingIdByKey.get(String(keyValue));
    if (existingId !== undefined) {
      updates.push({ id: existingId, row: { ...existingDataById.get(existingId), ...row } });
    } else {
      toInsert.push(row);
    }
  }

  const concurrency = 10;
  for (let i = 0; i < updates.length; i += concurrency) {
    const chunk = updates.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(({ id, row }) => supabase.from("dataset_rows").update({ data: row }).eq("id", id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }

  if (toInsert.length > 0) {
    const { data: maxRow } = await supabase
      .from("dataset_rows")
      .select("row_index")
      .eq("dataset_id", datasetId)
      .order("row_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const startIndex = (maxRow?.row_index ?? -1) + 1;

    const batchSize = 500;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize).map((row, idx) => ({
        dataset_id: datasetId,
        user_id: OWNER_USER_ID,
        row_index: startIndex + i + idx,
        data: row,
      }));
      const { error: insertError } = await supabase.from("dataset_rows").insert(batch);
      if (insertError) throw new Error(insertError.message);
    }
  }

  const { data: datasetRow, error: dsError } = await supabase
    .from("datasets")
    .select("columns")
    .eq("id", datasetId)
    .single();
  if (dsError) throw new Error(dsError.message);

  const columnSet = new Set<string>((datasetRow.columns as string[]) ?? []);
  for (const row of rows) {
    for (const col of Object.keys(row)) columnSet.add(col);
  }

  const totalRows = existing.length + toInsert.length;

  const { error: updateDatasetError } = await supabase
    .from("datasets")
    .update({
      columns: Array.from(columnSet),
      row_count: totalRows,
      source_filename: sourceFilename,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", datasetId);
  if (updateDatasetError) throw new Error(updateDatasetError.message);

  return { inserted: toInsert.length, updated: updates.length, totalRows };
}

export async function deleteDataset(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("datasets").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

export async function renameDataset(id: string, displayName: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("datasets")
    .update({ display_name: displayName })
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID);
  if (error) {
    if (error.code === "23505") throw new Error(`You already have a dataset named "${displayName}".`);
    throw new Error(error.message);
  }
}

export async function listDashboards(): Promise<{ id: string; name: string }[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dashboards")
    .select("id, name")
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface DashboardSummary {
  id: string;
  name: string;
  /** Derived from the dataset category of the dashboard's first card. */
  category: string;
}

/** Dashboards aren't tied to a category directly, so it's derived from the
 *  dataset their first card reads from — good enough for grouping them by
 *  business area in the Dashboards sidebar. */
export async function listDashboardsWithCategory(): Promise<DashboardSummary[]> {
  const [dashboards, datasets] = await Promise.all([listDashboards(), listDatasets()]);
  if (dashboards.length === 0) return [];

  const categoryByDatasetId = new Map(datasets.map((d) => [d.id, d.category]));
  const configs = await Promise.all(dashboards.map((d) => loadDashboard(d.id)));

  return dashboards.map((d, i) => {
    const firstCard = configs[i]?.cards[0];
    const category = (firstCard && categoryByDatasetId.get(firstCard.datasetId)) || "Other";
    return { id: d.id, name: d.name, category };
  });
}

export async function loadDashboard(id: string): Promise<DashboardConfig | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dashboards")
    .select("name, config")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const config = data.config as DashboardConfig;
  return { name: data.name as string, cards: config?.cards ?? [], filterColumns: config?.filterColumns ?? [] };
}

export async function saveDashboard(name: string, config: DashboardConfig): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dashboards")
    .upsert(
      {
        user_id: OWNER_USER_ID,
        name,
        config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,name" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteDashboard(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("dashboards").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}

// ---------- Dashboard template bindings ----------
// Template definitions themselves live in code (see lib/templates.ts); this
// just remembers which column plays each role for a given (template, dataset)
// pair, so the mapping only needs to be done once per dataset.

export async function getTemplateBinding(
  templateKey: string,
  datasetId: string,
): Promise<Record<string, string> | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("template_bindings")
    .select("role_mapping")
    .eq("template_key", templateKey)
    .eq("dataset_id", datasetId)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.role_mapping as Record<string, string>) ?? null;
}

export async function saveTemplateBinding(
  templateKey: string,
  datasetId: string,
  roleMapping: Record<string, string>,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("template_bindings").upsert(
    {
      user_id: OWNER_USER_ID,
      template_key: templateKey,
      dataset_id: datasetId,
      role_mapping: roleMapping,
    },
    { onConflict: "user_id,template_key,dataset_id" },
  );
  if (error) throw new Error(error.message);
}


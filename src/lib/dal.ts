import "server-only";
import { createClient } from "./supabase/server";
import type { DashboardConfig, DatasetRecord, DatasetSummary } from "./types";

export async function listDatasets(): Promise<DatasetSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("datasets")
    .select("id, display_name, category, source_filename, row_count, columns, uploaded_at")
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("datasets")
    .select("id, display_name, category, source_filename, row_count, columns, uploaded_at")
    .eq("id", id)
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
  const supabase = await createClient();
  const pageSize = 1000;
  let from = 0;
  const rows: DatasetRecord[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("dataset_rows")
      .select("data")
      .eq("dataset_id", id)
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const { data: dataset, error: upsertError } = await supabase
    .from("datasets")
    .upsert(
      {
        user_id: user.id,
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
    .eq("dataset_id", datasetId);
  if (deleteError) throw new Error(deleteError.message);

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map((row, idx) => ({
      dataset_id: datasetId,
      user_id: user.id,
      row_index: i + idx,
      data: row,
    }));
    const { error: insertError } = await supabase.from("dataset_rows").insert(batch);
    if (insertError) throw new Error(insertError.message);
  }

  return datasetId;
}

export async function deleteDataset(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("datasets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listDashboards(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboards")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function loadDashboard(id: string): Promise<DashboardConfig | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboards")
    .select("name, config")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const config = data.config as DashboardConfig;
  return { name: data.name as string, cards: config?.cards ?? [] };
}

export async function saveDashboard(name: string, config: DashboardConfig): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("dashboards")
    .upsert(
      {
        user_id: user.id,
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
  const supabase = await createClient();
  const { error } = await supabase.from("dashboards").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

"use server";

import { revalidatePath } from "next/cache";
import { deleteDataset, getDataset, ingestDataset, mergeDataset } from "@/lib/dal";
import { parseUpload } from "@/lib/parse";

export interface UploadResultItem {
  name: string;
  rowCount: number;
  columns: string[];
  detail?: string;
}

export interface UploadState {
  error?: string;
  results?: UploadResultItem[];
}

export async function uploadAndIngest(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const file = formData.get("file");
  const mode = String(formData.get("mode") ?? "new");
  const category = String(formData.get("category") ?? "Other");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }

  let targetName: string;
  let existingId = "";
  if (mode === "replace" || mode === "append") {
    existingId = String(formData.get("existingDatasetId") ?? "");
    const existing = existingId ? await getDataset(existingId) : null;
    if (!existing) {
      return { error: `Please pick a dataset to ${mode === "append" ? "update" : "replace"}.` };
    }
    targetName = existing.displayName;
  } else {
    targetName = String(formData.get("displayName") ?? "").trim();
    if (!targetName) {
      return { error: "Please enter a dataset name." };
    }
  }

  let sheets;
  try {
    sheets = await parseUpload(file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to parse file." };
  }

  const nonEmptySheets = sheets.filter((s) => s.rows.length > 0);
  if (nonEmptySheets.length === 0) {
    return { error: "No data rows were found in this file." };
  }

  if ((mode === "replace" || mode === "append") && nonEmptySheets.length > 1) {
    return {
      error:
        `This file has multiple sheets, which isn't supported when ${mode === "append" ? "updating" : "replacing"} a single existing dataset. ` +
        "Upload it as a new dataset instead, or use a file with one sheet.",
    };
  }

  if (mode === "append") {
    const keyColumn = String(formData.get("keyColumn") ?? "");
    if (!keyColumn) {
      return { error: "Please choose a key column to match rows on." };
    }
    const sheet = nonEmptySheets[0];
    if (!Object.keys(sheet.rows[0]).includes(keyColumn)) {
      return {
        error: `The uploaded file doesn't have a "${keyColumn}" column, so rows can't be matched to existing ones.`,
      };
    }

    try {
      const result = await mergeDataset(existingId, keyColumn, file.name, sheet.rows);
      revalidatePath("/");
      revalidatePath("/upload");
      revalidatePath("/dashboards");
      return {
        results: [
          {
            name: targetName,
            rowCount: result.totalRows,
            columns: Object.keys(sheet.rows[0]),
            detail: `${result.inserted} new row(s) added, ${result.updated} existing row(s) updated (${result.totalRows} total).`,
          },
        ],
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to merge dataset." };
    }
  }

  const results: UploadResultItem[] = [];
  try {
    for (const sheet of nonEmptySheets) {
      const name =
        mode === "new" && nonEmptySheets.length > 1 ? `${targetName} — ${sheet.sheetName}` : targetName;
      await ingestDataset(name, category, file.name, sheet.rows);
      results.push({
        name,
        rowCount: sheet.rows.length,
        columns: Object.keys(sheet.rows[0]),
      });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save dataset." };
  }

  revalidatePath("/");
  revalidatePath("/upload");
  revalidatePath("/dashboards");
  return { results };
}

export async function removeDataset(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await deleteDataset(id);
  revalidatePath("/upload");
  revalidatePath("/");
}

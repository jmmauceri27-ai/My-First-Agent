"use server";

import { revalidatePath } from "next/cache";
import { deleteDataset, getDataset, ingestDataset } from "@/lib/dal";
import { parseUpload } from "@/lib/parse";

export interface UploadResultItem {
  name: string;
  rowCount: number;
  columns: string[];
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
  if (mode === "replace") {
    const existingId = String(formData.get("existingDatasetId") ?? "");
    const existing = existingId ? await getDataset(existingId) : null;
    if (!existing) {
      return { error: "Please pick a dataset to replace." };
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

  if (mode === "replace" && nonEmptySheets.length > 1) {
    return {
      error:
        "This file has multiple sheets, which isn't supported when replacing a single existing dataset. " +
        "Upload it as a new dataset instead, or use a file with one sheet.",
    };
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

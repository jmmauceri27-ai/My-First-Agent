"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { deleteDataset, getDataset, ingestDataset, mergeDataset } from "@/lib/dal";
import { parseBuffer, type ParsedSheet } from "@/lib/parse";

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

export interface UploadMeta {
  mode: "new" | "replace" | "append";
  category: string;
  displayName?: string;
  existingDatasetId?: string;
  keyColumn?: string;
}

async function ingestParsedSheets(sheets: ParsedSheet[], sourceFilename: string, meta: UploadMeta): Promise<UploadState> {
  const { mode, category } = meta;

  let targetName: string;
  let existingId = "";
  if (mode === "replace" || mode === "append") {
    existingId = meta.existingDatasetId ?? "";
    const existing = existingId ? await getDataset(existingId) : null;
    if (!existing) {
      return { error: `Please pick a dataset to ${mode === "append" ? "update" : "replace"}.` };
    }
    targetName = existing.displayName;
  } else {
    targetName = (meta.displayName ?? "").trim();
    if (!targetName) {
      return { error: "Please enter a dataset name." };
    }
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
    const keyColumn = meta.keyColumn ?? "";
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
      const result = await mergeDataset(existingId, keyColumn, sourceFilename, sheet.rows);
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
      await ingestDataset(name, category, sourceFilename, sheet.rows);
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

/**
 * Files go browser -> Vercel Blob directly (see UploadForm.tsx + /api/upload-token),
 * bypassing the ~4.5MB request body ceiling Vercel enforces on serverless functions.
 * This action just fetches the already-uploaded blob, parses it, and cleans it up --
 * the parsed rows live in Postgres, so the blob itself is temporary.
 */
export async function uploadAndIngestFromBlob(
  blobUrl: string,
  fileName: string,
  meta: UploadMeta,
): Promise<UploadState> {
  let sheets: ParsedSheet[];
  try {
    const res = await fetch(blobUrl);
    if (!res.ok) throw new Error("Failed to retrieve the uploaded file.");
    const buffer = Buffer.from(await res.arrayBuffer());
    sheets = await parseBuffer(buffer, fileName);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to parse file." };
  } finally {
    del(blobUrl).catch(() => {});
  }

  return ingestParsedSheets(sheets, fileName, meta);
}

export async function removeDataset(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await deleteDataset(id);
  revalidatePath("/upload");
  revalidatePath("/");
}

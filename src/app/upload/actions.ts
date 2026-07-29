"use server";

import { revalidatePath } from "next/cache";
import {
  deleteDataset,
  deleteStaleUploadChunks,
  deleteUploadChunks,
  getDataset,
  getUploadChunks,
  ingestDataset,
  insertUploadChunk,
  mergeDataset,
  renameDataset,
} from "@/lib/dal";
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
 * Vercel's serverless functions hard-cap request bodies at ~4.5MB regardless of
 * Next.js's own serverActions.bodySizeLimit setting, so large files are sliced
 * into small pieces in the browser (see UploadForm.tsx) and sent one at a time.
 * Each chunk just gets stashed in a staging table until the file is complete.
 */
export async function uploadChunkAction(formData: FormData): Promise<void> {
  const chunk = formData.get("chunk");
  const uploadId = String(formData.get("uploadId") ?? "");
  const chunkIndex = Number(formData.get("chunkIndex"));
  if (!(chunk instanceof File) || !uploadId || Number.isNaN(chunkIndex)) {
    throw new Error("Malformed chunk upload.");
  }

  if (chunkIndex === 0) {
    deleteStaleUploadChunks().catch(() => {});
  }

  const buffer = Buffer.from(await chunk.arrayBuffer());
  await insertUploadChunk(uploadId, chunkIndex, buffer.toString("base64"));
}

/** Reassembles the chunks stashed by uploadChunkAction, parses the file, and cleans up. */
export async function finalizeUploadAction(
  uploadId: string,
  fileName: string,
  totalChunks: number,
  meta: UploadMeta,
): Promise<UploadState> {
  let sheets: ParsedSheet[];
  try {
    const chunks = await getUploadChunks(uploadId);
    if (chunks.length !== totalChunks) {
      return { error: `Upload incomplete: received ${chunks.length} of ${totalChunks} parts. Please try again.` };
    }
    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c, "base64")));
    sheets = await parseBuffer(buffer, fileName);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to parse file." };
  } finally {
    deleteUploadChunks(uploadId).catch(() => {});
  }

  return ingestParsedSheets(sheets, fileName, meta);
}

export async function removeDataset(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await deleteDataset(id);
  revalidatePath("/upload");
  revalidatePath("/");
}

export async function renameDatasetAction(id: string, displayName: string): Promise<{ error?: string }> {
  const trimmed = displayName.trim();
  if (!trimmed) return { error: "Dataset name can't be empty." };
  try {
    await renameDataset(id, trimmed);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to rename dataset." };
  }
  revalidatePath("/upload");
  revalidatePath("/");
  revalidatePath("/dashboards");
  revalidatePath("/procurement");
  return {};
}

"use server";

import { parseBuffer } from "./parse";
import { buildXlsxBase64 } from "./exportExcel";
import type { DatasetRecord } from "./types";

/** Parses an uploaded sheet and returns its raw rows + column names, so the caller can map columns before importing. Nothing is saved yet. */
export async function parseUploadedSheetAction(
  formData: FormData,
): Promise<{ rows?: Record<string, string | number | boolean | null>[]; columns?: string[]; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const sheets = await parseBuffer(buffer, file.name);
    const rows = sheets.find((s) => s.rows.length > 0)?.rows ?? [];
    if (rows.length === 0) {
      return { error: "No data rows were found in this file." };
    }
    return { rows, columns: Object.keys(rows[0]) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to parse file." };
  }
}

/** Builds a downloadable .xlsx (base64) from rows + column order -- used for example/template downloads. */
export async function buildTemplateXlsxAction(rows: DatasetRecord[], columns: string[]): Promise<string> {
  return buildXlsxBase64(rows, columns);
}

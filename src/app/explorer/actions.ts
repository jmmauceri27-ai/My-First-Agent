"use server";

import { getDatasetRows } from "@/lib/dal";
import { buildXlsxBase64 } from "@/lib/exportExcel";
import type { DatasetRecord } from "@/lib/types";

export async function fetchRows(datasetId: string): Promise<DatasetRecord[]> {
  return getDatasetRows(datasetId);
}

export async function exportToExcel(rows: DatasetRecord[], columns: string[]): Promise<string> {
  return buildXlsxBase64(rows, columns);
}

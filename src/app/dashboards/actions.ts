"use server";

import { getSourceRows } from "@/lib/dashboardData";
import { getDashboardSource } from "@/lib/dashboardSources";
import type { DashboardSourceKey } from "@/lib/dashboardSources";
import { buildMultiSheetXlsxBase64 } from "@/lib/exportExcel";
import type { XlsxSheetSpec } from "@/lib/exportExcel";
import type { DatasetRecord } from "@/lib/types";

export async function fetchSourceRowsAction(source: DashboardSourceKey): Promise<DatasetRecord[]> {
  return getSourceRows(source);
}

/** Exports the rows currently backing a dashboard -- one sheet per data source it uses -- as a downloadable .xlsx. */
export async function exportDashboardDataAction(
  sheets: { source: DashboardSourceKey; rows: DatasetRecord[] }[],
): Promise<string> {
  const specs: XlsxSheetSpec[] = sheets.map(({ source, rows }) => {
    const def = getDashboardSource(source);
    return { name: def.label, rows, columns: def.columns.map((c) => ({ key: c.key, label: c.label })) };
  });
  return buildMultiSheetXlsxBase64(specs);
}

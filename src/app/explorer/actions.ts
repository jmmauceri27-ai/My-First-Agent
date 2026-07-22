"use server";

import ExcelJS from "exceljs";
import { getDatasetRows } from "@/lib/dal";
import type { DatasetRecord } from "@/lib/types";

export async function fetchRows(datasetId: string): Promise<DatasetRecord[]> {
  return getDatasetRows(datasetId);
}

export async function exportToExcel(rows: DatasetRecord[], columns: string[]): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");
  sheet.columns = columns.map((c) => ({
    header: c,
    key: c,
    width: Math.min(Math.max(c.length + 2, 12), 40),
  }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}

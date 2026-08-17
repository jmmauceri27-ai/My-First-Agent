import "server-only";
import ExcelJS from "exceljs";
import type { DatasetRecord } from "./types";

/** Builds a single-sheet .xlsx workbook from rows + column order, returned as base64 for the client to download. */
export async function buildXlsxBase64(rows: DatasetRecord[], columns: string[]): Promise<string> {
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

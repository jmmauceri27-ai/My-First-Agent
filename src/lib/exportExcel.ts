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

export interface XlsxSheetSpec {
  /** Sheet tab name -- truncated to Excel's 31-char limit. */
  name: string;
  rows: DatasetRecord[];
  columns: { key: string; label: string }[];
}

/** Builds a multi-sheet .xlsx workbook (one sheet per entry), returned as base64 for the client to download. */
export async function buildMultiSheetXlsxBase64(sheets: XlsxSheetSpec[]): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  for (const { name, rows, columns } of sheets) {
    const sheet = workbook.addWorksheet(name.slice(0, 31));
    sheet.columns = columns.map((c) => ({
      header: c.label,
      key: c.key,
      width: Math.min(Math.max(c.label.length + 2, 12), 40),
    }));
    sheet.getRow(1).font = { bold: true };
    rows.forEach((row) => sheet.addRow(row));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}

import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { DatasetRecord } from "./types";

export interface ParsedSheet {
  sheetName: string;
  rows: DatasetRecord[];
}

function normalizeCellValue(value: ExcelJS.CellValue): string | number | boolean | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((t) => t.text).join("");
    }
    if ("text" in value) {
      return String(value.text);
    }
    if ("result" in value) {
      return normalizeCellValue(value.result ?? null);
    }
    if ("error" in value) {
      return null;
    }
    return null;
  }

  return value;
}

async function parseXlsx(buffer: Buffer): Promise<ParsedSheet[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled types conflict with a nested, older @types/node pulled in
  // via its fast-csv dependency; the runtime value is a plain Node Buffer either way.
  // @ts-expect-error -- Buffer type mismatch from exceljs's transitive @types/node
  await workbook.xlsx.load(buffer);

  const sheets: ParsedSheet[] = [];

  workbook.eachSheet((worksheet) => {
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = normalizeCellValue(cell.value);
      headers[colNumber] = value !== null ? String(value).trim() : `Column${colNumber}`;
    });

    const rows: DatasetRecord[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const record: DatasetRecord = {};
      let hasValue = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (!header) return;
        const value = normalizeCellValue(cell.value);
        record[header] = value;
        if (value !== null && value !== "") hasValue = true;
      });
      if (hasValue) rows.push(record);
    });

    sheets.push({ sheetName: worksheet.name, rows });
  });

  return sheets;
}

function parseCsv(buffer: Buffer): ParsedSheet[] {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  return [{ sheetName: "Sheet1", rows: result.data as DatasetRecord[] }];
}

export async function parseUpload(file: File): Promise<ParsedSheet[]> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".csv")) {
    return parseCsv(buffer);
  }
  if (name.endsWith(".xlsx")) {
    return parseXlsx(buffer);
  }

  throw new Error(
    `Unsupported file type for '${file.name}'. Please upload a .xlsx or .csv file.`,
  );
}

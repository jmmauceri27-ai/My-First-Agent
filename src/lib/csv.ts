// Shared CSV/TSV parsing helpers. Auto-detects delimiter because pasting
// cells from a spreadsheet app (Excel/Sheets/Numbers) copies them as
// tab-separated, not comma-separated, and a file upload could be either.

export function detectDelimiter(firstLine: string): string {
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return tabCount > commaCount ? "\t" : ",";
}

export function splitRow(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((c) => c.trim());
}

export function parseDelimited(
  raw: string,
  expectedColumns: readonly string[]
): { columns: string[]; dataLines: string[]; delimiter: string } {
  const trimmed = raw.trim();
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { columns: [], dataLines: [], delimiter: "," };

  const delimiter = detectDelimiter(lines[0]);
  const header = splitRow(lines[0], delimiter);
  const headerMatches = expectedColumns.some((c) => new RegExp(`^${c}$`, "i").test(header[0]));

  const dataLines = headerMatches ? lines.slice(1) : lines;
  const columns = headerMatches ? header : expectedColumns.slice(0, header.length);
  return { columns, dataLines, delimiter };
}

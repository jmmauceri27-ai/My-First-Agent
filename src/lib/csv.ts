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

// Splits a single CSV line into fields, respecting double-quoted fields that
// contain the delimiter itself (e.g. `1,"Smith Atl, RB",CJ` is 3 fields, not 4).
export function splitQuotedRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// Normalizes a player name for matching across data sources that format
// suffixes/punctuation differently (e.g. "Kenneth Walker III" vs
// "Kenneth Walker" vs "Kenneth Walker, III", "Ja'Marr Chase" vs
// "Ja Marr Chase"). Strips punctuation and a trailing generational suffix.
export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,'']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "");
}

export function parseDelimited(
  raw: string,
  expectedColumns: readonly string[]
): { columns: string[]; dataLines: string[]; delimiter: string } {
  const trimmed = raw.trim();
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { columns: [], dataLines: [], delimiter: "," };

  const delimiter = detectDelimiter(lines[0]);
  const header = splitQuotedRow(lines[0], delimiter);
  const headerMatches = expectedColumns.some((c) => new RegExp(`^${c}$`, "i").test(header[0]));

  const dataLines = headerMatches ? lines.slice(1) : lines;
  const columns = headerMatches ? header : expectedColumns.slice(0, header.length);
  return { columns, dataLines, delimiter };
}

import Papa from "papaparse";
import { ProductCategory } from "@/generated/prisma/client";
import { categorizeProductName } from "./categorize";
import { slugify, sanitizeSkuPart } from "@/lib/slug";

export interface ParsedProduct {
  tempId: number;
  parentTempId: number | null;
  isChild: boolean;
  sku: string;
  slug: string;
  name: string;
  category: ProductCategory;
  quantity: number;
  poNumber: string | null;
  jobNumber: string | null;
  lineNumbers: string[];
  callSize: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  handing: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  jambDepth: string | null;
  miscNotes: string | null;
}

const DESCRIPTOR_COUNT = 9; // callSize, color, interiorColor, handing, opt1, opt2, opt3, jamb, misc

function normalize(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  if (v === "" || v.toUpperCase() === "NA" || v.toUpperCase() === "N/A") {
    return null;
  }
  return v;
}

const CHILD_LINE_RE = /^(\d+)([a-zA-Z])$/;

/**
 * Parses the manufacturer "graveyard" order-list CSV.
 *
 * The sheet mixes two row shapes under one set of columns:
 *  - group header rows: `Order,PO,,,,,,,,,` (job/PO identifier, everything
 *    else blank) that precede a run of line items belonging to that job
 *  - item rows: `LineNumber,ProductName,CallSize,Color,InteriorColor,
 *    Handing,Option1,Option2,Option3,Jamb,Misc`
 *
 * Item rows whose line number is like "9a" are treated as a child/add-on of
 * the most recent line "9" in the same group (e.g. a screen for a window).
 * Consecutive rows with identical descriptive fields are collapsed into a
 * single product with an incremented quantity.
 */
export function parseGraveyardCsv(csvText: string): ParsedProduct[] {
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: false,
  });

  const rows = parsed.data;
  const results: ParsedProduct[] = [];
  const skuSeen = new Set<string>();

  let groupOrder: string | null = null;
  let groupJob: string | null = null;
  let groupKey = "";
  // groupKey + numeric line number -> index into results[]
  const parentMap = new Map<string, number>();
  let lastKey: string | null = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const cols = Array.from({ length: 11 }, (_, idx) => (row[idx] ?? "").trim());
    const allEmpty = cols.every((c) => c === "");
    if (allEmpty) continue;

    // Stray duplicated sub-header row ("Line #,Product Name,,,...").
    if (cols[0] === "Line #" && cols[1] === "Product Name") continue;

    const descriptorCols = cols.slice(2, 2 + DESCRIPTOR_COUNT);
    const isGroupHeader = descriptorCols.every((c) => c === "");

    if (isGroupHeader) {
      groupOrder = normalize(cols[0]);
      groupJob = normalize(cols[1]);
      groupKey = `${groupOrder ?? ""}|${groupJob ?? ""}|${i}`;
      lastKey = null;
      continue;
    }

    // Item row.
    const lineRaw = cols[0];
    const name = normalize(cols[1]) ?? "";
    const callSize = normalize(cols[2]);
    const exteriorColor = normalize(cols[3]);
    const interiorColor = normalize(cols[4]);
    const handing = normalize(cols[5]);
    const option1 = normalize(cols[6]);
    const option2 = normalize(cols[7]);
    const option3 = normalize(cols[8]);
    const jambDepth = normalize(cols[9]);
    const miscNotes = normalize(cols[10]);

    const childMatch = CHILD_LINE_RE.exec(lineRaw);
    const isChild = childMatch !== null;
    const numericLine = childMatch ? childMatch[1] : /^\d+$/.test(lineRaw) ? lineRaw : null;

    const identityKey = [
      groupKey,
      isChild ? "child" : "parent",
      name.toUpperCase(),
      callSize,
      exteriorColor,
      interiorColor,
      handing,
      option1,
      option2,
      option3,
      jambDepth,
      miscNotes,
    ].join("::");

    const previous = results[results.length - 1];
    if (previous && identityKey === lastKey) {
      previous.quantity += 1;
      previous.lineNumbers.push(lineRaw);
      continue;
    }

    let parentTempId: number | null = null;
    if (isChild && numericLine) {
      const key = `${groupKey}#${numericLine}`;
      parentTempId = parentMap.get(key) ?? null;
    }

    const tempId = results.length;
    const category = categorizeProductName(name);

    const skuBase = `${sanitizeSkuPart(groupOrder ?? "MISC")}-${sanitizeSkuPart(
      groupJob ?? "0"
    )}-L${sanitizeSkuPart(lineRaw || String(tempId))}`;
    let sku = skuBase;
    let suffix = 1;
    while (skuSeen.has(sku)) {
      suffix += 1;
      sku = `${skuBase}-${suffix}`;
    }
    skuSeen.add(sku);

    const displayName = name || `Unnamed item (line ${lineRaw || tempId})`;
    const slug = `${slugify(displayName)}-${sku.toLowerCase()}`;

    const product: ParsedProduct = {
      tempId,
      parentTempId,
      isChild,
      sku,
      slug,
      name: displayName,
      category,
      quantity: 1,
      poNumber: groupOrder,
      jobNumber: groupJob,
      lineNumbers: [lineRaw],
      callSize,
      exteriorColor,
      interiorColor,
      handing,
      option1,
      option2,
      option3,
      jambDepth,
      miscNotes,
    };

    results.push(product);
    lastKey = identityKey;

    if (!isChild && numericLine) {
      parentMap.set(`${groupKey}#${numericLine}`, tempId);
    }
  }

  return results;
}

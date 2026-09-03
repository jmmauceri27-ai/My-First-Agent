"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import { buildTemplateXlsxAction, parseUploadedSheetAction } from "@/lib/sheetActions";
import { matchPricingBasis, matchRateItemCategory, matchRateTier } from "@/lib/crmTypes";
import type { Contract, RateItemImportRow } from "@/lib/crmTypes";
import { matchTrade } from "@/lib/trades";
import { bulkCreateRateItemsAction } from "./actions";

type ParsedRow = Record<string, string | number | boolean | null>;

const NONE = "";

const TEMPLATE_COLUMNS = [
  "Trade",
  "Category",
  "Item Name",
  "Pricing Basis",
  "Rate Tier",
  "Rate",
  "Unit Label",
  "Notes",
];

const TEMPLATE_EXAMPLE = {
  Trade: "Land",
  Category: "Labor",
  "Item Name": "Landscape Laborer",
  "Pricing Basis": "Per Hour",
  "Rate Tier": "Standard",
  Rate: 75,
  "Unit Label": "",
  Notes: "",
};

async function handleDownloadTemplate() {
  const base64 = await buildTemplateXlsxAction([TEMPLATE_EXAMPLE], TEMPLATE_COLUMNS);
  downloadBase64Xlsx(base64, "rate_items_template.xlsx");
}

export default function UploadRateItemsModal({
  contracts,
  onClose,
}: {
  contracts: Contract[];
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contractId, setContractId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    trade: NONE,
    category: NONE,
    itemName: NONE,
    pricingBasis: NONE,
    rateTier: NONE,
    rate: NONE,
    unitLabel: NONE,
    notes: NONE,
  });

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
    unmatchedTrades: string[];
    unmatchedCategories: string[];
    unmatchedPricingBasis: string[];
  } | null>(null);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Please choose a file.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const parsed = await parseUploadedSheetAction(formData);
      if (parsed.error || !parsed.rows || !parsed.columns) {
        setUploadError(parsed.error ?? "Failed to parse file.");
        return;
      }
      const columns = parsed.columns;
      setParsedRows(parsed.rows);
      setParsedColumns(columns);
      setMapping({
        trade: columns.find((c) => /^trade$/i.test(c.trim())) ?? NONE,
        category: columns.find((c) => /^category$/i.test(c.trim())) ?? NONE,
        itemName: columns.find((c) => /item.?name|description/i.test(c)) ?? NONE,
        pricingBasis: columns.find((c) => /pricing.?basis|basis/i.test(c)) ?? NONE,
        rateTier: columns.find((c) => /tier/i.test(c)) ?? NONE,
        rate: columns.find((c) => /^rate$/i.test(c.trim()) || /price|amount/i.test(c)) ?? NONE,
        unitLabel: columns.find((c) => /unit.?label/i.test(c)) ?? NONE,
        notes: columns.find((c) => /notes?/i.test(c)) ?? NONE,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload sheet.");
    } finally {
      setUploading(false);
    }
  }

  async function handleImport() {
    if (!parsedRows || !mapping.trade || !mapping.category || !mapping.itemName || !mapping.pricingBasis || !mapping.rate)
      return;
    setImportError(null);
    setImporting(true);
    try {
      const rows: RateItemImportRow[] = [];
      const unmatchedTrades: string[] = [];
      const unmatchedCategories: string[] = [];
      const unmatchedPricingBasis: string[] = [];
      let skipped = 0;

      for (const row of parsedRows) {
        const tradeRaw = String(row[mapping.trade] ?? "").trim();
        const categoryRaw = String(row[mapping.category] ?? "").trim();
        const itemName = String(row[mapping.itemName] ?? "").trim();
        const pricingBasisRaw = String(row[mapping.pricingBasis] ?? "").trim();
        const rateValue = Number(row[mapping.rate]);

        const trade = matchTrade(tradeRaw);
        const category = matchRateItemCategory(categoryRaw);
        const pricingBasis = matchPricingBasis(pricingBasisRaw);

        if (!trade) {
          if (tradeRaw) unmatchedTrades.push(tradeRaw);
          skipped++;
          continue;
        }
        if (!category) {
          if (categoryRaw) unmatchedCategories.push(categoryRaw);
          skipped++;
          continue;
        }
        if (!itemName || !pricingBasis || !Number.isFinite(rateValue)) {
          if (pricingBasisRaw && !pricingBasis) unmatchedPricingBasis.push(pricingBasisRaw);
          skipped++;
          continue;
        }

        const rateTierRaw = mapping.rateTier ? String(row[mapping.rateTier] ?? "").trim() : "";
        const rateTier = matchRateTier(rateTierRaw) ?? "Standard";

        rows.push({
          trade,
          category,
          itemName,
          pricingBasis,
          rateTier,
          rate: rateValue,
          unitLabel: mapping.unitLabel ? String(row[mapping.unitLabel] ?? "").trim() || null : null,
          notes: mapping.notes ? String(row[mapping.notes] ?? "").trim() || null : null,
          contractId: contractId || null,
        });
      }

      const outcome = await bulkCreateRateItemsAction(rows);
      if (outcome.error || outcome.inserted == null) {
        setImportError(outcome.error ?? "Failed to import rate items.");
        return;
      }
      setResult({
        inserted: outcome.inserted,
        skipped,
        unmatchedTrades: Array.from(new Set(unmatchedTrades)),
        unmatchedCategories: Array.from(new Set(unmatchedCategories)),
        unmatchedPricingBasis: Array.from(new Set(unmatchedPricingBasis)),
      });
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-50">Rate items imported</h2>
          <p className="mt-2 text-sm text-slate-300">
            Added {result.inserted} rate item{result.inserted === 1 ? "" : "s"}.
          </p>
          {result.skipped > 0 && (
            <p className="mt-2 text-xs text-critical">
              {result.skipped} row{result.skipped === 1 ? "" : "s"} skipped -- missing or unrecognized Trade,
              Category, Pricing Basis, Item Name, or Rate.
            </p>
          )}
          {result.unmatchedTrades.length > 0 && (
            <p className="mt-2 text-xs text-critical">
              Unrecognized Trade values: {result.unmatchedTrades.slice(0, 10).join(", ")}
              {result.unmatchedTrades.length > 10 ? `, +${result.unmatchedTrades.length - 10} more` : ""}
            </p>
          )}
          {result.unmatchedCategories.length > 0 && (
            <p className="mt-2 text-xs text-critical">
              Unrecognized Category values: {result.unmatchedCategories.slice(0, 10).join(", ")}
              {result.unmatchedCategories.length > 10 ? `, +${result.unmatchedCategories.length - 10} more` : ""}
            </p>
          )}
          {result.unmatchedPricingBasis.length > 0 && (
            <p className="mt-2 text-xs text-critical">
              Unrecognized Pricing Basis values: {result.unmatchedPricingBasis.slice(0, 10).join(", ")}
              {result.unmatchedPricingBasis.length > 10 ? `, +${result.unmatchedPricingBasis.length - 10} more` : ""}
            </p>
          )}
          <div className="mt-6">
            <Button onClick={onClose}>Done</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-50">Upload rate items</h2>
        <p className="mt-1 text-xs text-slate-400">
          Upload an .xlsx or .csv sheet of rate items -- Trade and Category must match the app&rsquo;s fixed lists
          (e.g. Trade: Land, Snow Removal...; Category: Labor, Equipment, Materials, Service).{" "}
          <button type="button" onClick={handleDownloadTemplate} className="text-brand-400 hover:underline">
            Download example template
          </button>
        </p>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Contract (optional)</span>
          <select value={contractId} onChange={(e) => setContractId(e.target.value)} className={inputClass}>
            <option value="">Generic (no contract)</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.companyName ? ` · ${c.companyName}` : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            Applies to every row in this file -- leave as Generic for the default catalog, or pick a contract to
            import its own negotiated rate card (e.g. an MSA rate sheet). It&rsquo;ll be used instead of the
            generic rate for any trade it covers.
          </span>
        </label>

        <div className="mt-4 flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            className="text-xs text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-800 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-400"
          />
          <Button type="button" variant="secondary" onClick={handleUpload} disabled={uploading} className="w-fit">
            {uploading ? "Parsing…" : "Choose file"}
          </Button>
          {uploadError && <p className="text-xs text-critical">{uploadError}</p>}
        </div>

        {parsedRows && (
          <>
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-3">
              <p className="text-sm text-slate-300">
                Map this sheet&rsquo;s columns — {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"} found.
              </p>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    ["trade", "Trade column"],
                    ["category", "Category column"],
                    ["itemName", "Item Name column"],
                    ["pricingBasis", "Pricing Basis column"],
                    ["rateTier", "Rate Tier column (optional)"],
                    ["rate", "Rate column"],
                    ["unitLabel", "Unit Label column (optional)"],
                    ["notes", "Notes column (optional)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-300">{label}</span>
                    <select
                      value={mapping[key]}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                      className={inputClass}
                    >
                      <option value={NONE}>{key === "unitLabel" || key === "notes" || key === "rateTier" ? "None" : "Choose a column…"}</option>
                      {parsedColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Rate Tier defaults to Standard when left unmapped or a cell doesn&rsquo;t match Standard/OT/Premium.
                Rows with an unrecognized Trade, Category, or Pricing Basis are skipped and reported after import.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleImport}
              disabled={importing || !mapping.trade || !mapping.category || !mapping.itemName || !mapping.pricingBasis || !mapping.rate}
              className="mt-4 w-fit"
            >
              {importing ? "Importing…" : `Import ${parsedRows.length} rate item${parsedRows.length === 1 ? "" : "s"}`}
            </Button>
            {importError && <p className="mt-2 text-xs text-critical">{importError}</p>}
          </>
        )}

        <div className="mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

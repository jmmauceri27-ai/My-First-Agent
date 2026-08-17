"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import { buildTemplateXlsxAction, parseUploadedSheetAction } from "@/lib/sheetActions";
import type { CompanyImportRow } from "@/lib/crmTypes";
import { bulkCreateCompaniesAction } from "../actions";

type ParsedRow = Record<string, string | number | boolean | null>;

const NONE = "";

const TEMPLATE_COLUMNS = ["Client Name", "Address", "City", "State", "Website", "Notes"];

const TEMPLATE_EXAMPLE = {
  "Client Name": "Example Client LLC",
  Address: "456 Oak Ave",
  City: "Springfield",
  State: "IL",
  Website: "https://example.com",
  Notes: "Sample notes",
};

async function handleDownloadTemplate() {
  const base64 = await buildTemplateXlsxAction([TEMPLATE_EXAMPLE], TEMPLATE_COLUMNS);
  downloadBase64Xlsx(base64, "client_upload_template.xlsx");
}

export default function UploadCompaniesModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    name: NONE,
    address: NONE,
    city: NONE,
    state: NONE,
    website: NONE,
    notes: NONE,
  });

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

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
      const result = await parseUploadedSheetAction(formData);
      if (result.error || !result.rows || !result.columns) {
        setUploadError(result.error ?? "Failed to parse file.");
        return;
      }
      setParsedRows(result.rows);
      setParsedColumns(result.columns);
      setMapping({
        name: result.columns.find((c) => /name/i.test(c)) ?? result.columns[0] ?? NONE,
        address: result.columns.find((c) => /address/i.test(c)) ?? NONE,
        city: result.columns.find((c) => /^city/i.test(c)) ?? NONE,
        state: result.columns.find((c) => /^state|^st$/i.test(c)) ?? NONE,
        website: result.columns.find((c) => /website|url/i.test(c)) ?? NONE,
        notes: result.columns.find((c) => /notes?/i.test(c)) ?? NONE,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload clients.");
    } finally {
      setUploading(false);
    }
  }

  async function handleImport() {
    if (!parsedRows || !mapping.name) return;
    setImportError(null);
    setImporting(true);
    try {
      const rows: CompanyImportRow[] = parsedRows.map((row) => ({
        name: String(row[mapping.name] ?? "").trim() || "Untitled client",
        address: mapping.address ? String(row[mapping.address] ?? "").trim() || null : null,
        city: mapping.city ? String(row[mapping.city] ?? "").trim() || null : null,
        state: mapping.state ? String(row[mapping.state] ?? "").trim() || null : null,
        website: mapping.website ? String(row[mapping.website] ?? "").trim() || null : null,
        notes: mapping.notes ? String(row[mapping.notes] ?? "").trim() || null : null,
      }));
      const result = await bulkCreateCompaniesAction(rows);
      if (result.error || result.inserted == null) {
        setImportError(result.error ?? "Failed to import clients.");
        return;
      }
      setImportedCount(result.inserted);
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  if (importedCount != null) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-50">Clients imported</h2>
          <p className="mt-2 text-sm text-slate-300">
            Added {importedCount} client{importedCount === 1 ? "" : "s"}.
          </p>
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
        <h2 className="text-lg font-bold text-slate-50">Upload clients</h2>
        <p className="mt-1 text-xs text-slate-400">
          Upload an .xlsx or .csv sheet of clients.{" "}
          <button type="button" onClick={handleDownloadTemplate} className="text-brand-400 hover:underline">
            Download example template
          </button>
        </p>

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
                    ["name", "Client name column"],
                    ["address", "Address column (optional)"],
                    ["city", "City column (optional)"],
                    ["state", "State column (optional)"],
                    ["website", "Website column (optional)"],
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
                      <option value={NONE}>{key === "name" ? "Choose a column…" : "None"}</option>
                      {parsedColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleImport}
              disabled={importing || !mapping.name}
              className="mt-4 w-fit"
            >
              {importing ? "Importing…" : `Import ${parsedRows.length} client${parsedRows.length === 1 ? "" : "s"}`}
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

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import { buildTemplateXlsxAction, parseUploadedSheetAction } from "@/lib/sheetActions";
import { DEPARTMENTS } from "@/lib/crmTypes";
import type { EmployeeImportRow } from "@/lib/crmTypes";
import { bulkCreateEmployeesAction } from "@/app/crm/actions";

type ParsedRow = Record<string, string | number | boolean | null>;

const NONE = "";

const TEMPLATE_COLUMNS = ["Employee Name", "Email", "Phone", "Title", "Department"];

const TEMPLATE_EXAMPLE = {
  "Employee Name": "Jane Smith",
  Email: "jane.smith@example.com",
  Phone: "555-987-6543",
  Title: "Operations Manager",
  Department: DEPARTMENTS[0],
};

async function handleDownloadTemplate() {
  const base64 = await buildTemplateXlsxAction([TEMPLATE_EXAMPLE], TEMPLATE_COLUMNS);
  downloadBase64Xlsx(base64, "employee_upload_template.xlsx");
}

export default function UploadEmployeesModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    name: NONE,
    email: NONE,
    phone: NONE,
    title: NONE,
    department: NONE,
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
        email: result.columns.find((c) => /email/i.test(c)) ?? NONE,
        phone: result.columns.find((c) => /phone/i.test(c)) ?? NONE,
        title: result.columns.find((c) => /title/i.test(c)) ?? NONE,
        department: result.columns.find((c) => /department|dept/i.test(c)) ?? NONE,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload employees.");
    } finally {
      setUploading(false);
    }
  }

  function matchDepartment(raw: string | null): string | null {
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase();
    return DEPARTMENTS.find((d) => d.toLowerCase() === normalized) ?? null;
  }

  async function handleImport() {
    if (!parsedRows || !mapping.name) return;
    setImportError(null);
    setImporting(true);
    try {
      const rows: EmployeeImportRow[] = parsedRows.map((row) => ({
        name: String(row[mapping.name] ?? "").trim() || "Untitled employee",
        email: mapping.email ? String(row[mapping.email] ?? "").trim() || null : null,
        phone: mapping.phone ? String(row[mapping.phone] ?? "").trim() || null : null,
        title: mapping.title ? String(row[mapping.title] ?? "").trim() || null : null,
        department: mapping.department ? matchDepartment(String(row[mapping.department] ?? "")) : null,
      }));
      const result = await bulkCreateEmployeesAction(rows);
      if (result.error || result.inserted == null) {
        setImportError(result.error ?? "Failed to import employees.");
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
          <h2 className="text-lg font-bold text-slate-50">Employees imported</h2>
          <p className="mt-2 text-sm text-slate-300">
            Added {importedCount} employee{importedCount === 1 ? "" : "s"}.
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
        <h2 className="text-lg font-bold text-slate-50">Upload employees</h2>
        <p className="mt-1 text-xs text-slate-400">
          Upload an .xlsx or .csv sheet of employees. Department values are matched against{" "}
          {DEPARTMENTS.join(" / ")} (case-insensitive) — anything else is left unassigned.{" "}
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
                    ["name", "Employee name column"],
                    ["email", "Email column (optional)"],
                    ["phone", "Phone column (optional)"],
                    ["title", "Title column (optional)"],
                    ["department", "Department column (optional)"],
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
              {importing ? "Importing…" : `Import ${parsedRows.length} employee${parsedRows.length === 1 ? "" : "s"}`}
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

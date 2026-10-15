"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import { buildTemplateXlsxAction } from "@/lib/sheetActions";
import type { DatasetRecord } from "@/lib/types";
import type { Company, FieldClass } from "@/lib/crmTypes";
import type { SiteFieldValuesUpdateRow } from "@/lib/networkTypes";
import { bulkUpdateSiteFieldValuesAction, parseSiteSheetAction } from "./actions";

type ParsedRow = Record<string, string | number | boolean | null>;

const NONE = "";

/** Converts a raw sheet cell into this field's own stored string form (see DynamicFieldsSection) -- null
 * means "leave this field untouched for this row" (blank cell, or a Checkbox cell that's neither a recognized
 * yes nor no), same as a mapped Measurements column left blank. */
function parseFieldValue(fieldType: string, raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (fieldType === "Checkbox") {
    const lower = trimmed.toLowerCase();
    if (["yes", "y", "true", "1", "x"].includes(lower)) return "true";
    if (["no", "n", "false", "0"].includes(lower)) return "false";
    return null;
  }
  if (fieldType === "Number") {
    const num = Number(trimmed);
    return Number.isFinite(num) ? String(num) : null;
  }
  return trimmed;
}

const FIELD_TYPE_EXAMPLES: Record<string, string> = {
  Text: "Example",
  Number: "1234",
  Date: "2026-01-01",
  Dropdown: "(one of its options)",
  Checkbox: "Yes",
};

export default function UpdateSiteFieldValuesModal({
  companies,
  fieldClasses,
  onClose,
}: {
  companies: Company[];
  fieldClasses: FieldClass[];
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [matchMapping, setMatchMapping] = useState({ matchCode: NONE, matchId: NONE, matchName: NONE });
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [companyId, setCompanyId] = useState("");

  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; notFound: string[]; ambiguous: string[] } | null>(null);

  const allFields = fieldClasses.flatMap((c) => c.fields);

  async function handleDownloadTemplate() {
    const columns = ["Site ID", "Site Name", ...allFields.map((f) => f.label)];
    const example: DatasetRecord = { "Site ID": "TDC0234", "Site Name": "Example Site" };
    for (const f of allFields) example[f.label] = FIELD_TYPE_EXAMPLES[f.fieldType] ?? "Example";
    const base64 = await buildTemplateXlsxAction([example], columns);
    downloadBase64Xlsx(base64, "site_custom_fields_template.xlsx");
  }

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
      const parsed = await parseSiteSheetAction(formData);
      if (parsed.error || !parsed.rows || !parsed.columns) {
        setUploadError(parsed.error ?? "Failed to parse file.");
        return;
      }
      const columns = parsed.columns;
      setParsedRows(parsed.rows);
      setParsedColumns(columns);
      setMatchMapping({
        matchCode: columns.find((c) => /site.?id/i.test(c)) ?? NONE,
        matchId: columns.find((c) => /^record ?id$/i.test(c) || /^id$/i.test(c)) ?? NONE,
        matchName: columns.find((c) => /^site ?name$/i.test(c) || /^name$/i.test(c)) ?? NONE,
      });
      setFieldMapping(
        Object.fromEntries(
          allFields.map((f) => {
            const normalized = f.label.toLowerCase().replace(/[^a-z]/g, "");
            const match = columns.find((c) => c.toLowerCase().replace(/[^a-z]/g, "") === normalized);
            return [f.id, match ?? NONE];
          }),
        ),
      );
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload sheet.");
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdate() {
    if (!parsedRows || (!matchMapping.matchCode && !matchMapping.matchId && !matchMapping.matchName)) return;
    setUpdateError(null);
    setUpdating(true);
    try {
      const rows: SiteFieldValuesUpdateRow[] = parsedRows.map((row) => {
        const values: Record<string, string> = {};
        for (const f of allFields) {
          const column = fieldMapping[f.id];
          if (!column) continue;
          const value = parseFieldValue(f.fieldType, String(row[column] ?? ""));
          if (value != null) values[f.id] = value;
        }
        return {
          matchCode: matchMapping.matchCode ? String(row[matchMapping.matchCode] ?? "").trim() || null : null,
          matchId: matchMapping.matchId ? String(row[matchMapping.matchId] ?? "").trim() || null : null,
          matchName: matchMapping.matchName ? String(row[matchMapping.matchName] ?? "").trim() || null : null,
          values,
        };
      });

      const outcome = await bulkUpdateSiteFieldValuesAction(rows, companyId || null);
      if (outcome.error) {
        setUpdateError(outcome.error);
        return;
      }
      setResult(outcome);
      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  const anyFieldMapped = allFields.some((f) => fieldMapping[f.id]);

  if (result) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Custom fields updated</h2>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Updated {result.updated} site{result.updated === 1 ? "" : "s"}. Only the mapped fields changed --
            everything else on those sites was left as-is. A mapped field was attached to a site automatically if
            it wasn&rsquo;t already.
          </p>
          {result.notFound.length > 0 && (
            <p className="mt-2 text-xs text-critical">
              {result.notFound.length} row{result.notFound.length === 1 ? "" : "s"} didn&rsquo;t match any existing
              site: {result.notFound.slice(0, 10).join(", ")}
              {result.notFound.length > 10 ? `, +${result.notFound.length - 10} more` : ""}
            </p>
          )}
          {result.ambiguous.length > 0 && (
            <p className="mt-2 text-xs text-critical">
              {result.ambiguous.length} name{result.ambiguous.length === 1 ? "" : "s"} matched more than one site
              (pick a Client above to disambiguate, or map a Site ID column): {result.ambiguous.slice(0, 10).join(", ")}
              {result.ambiguous.length > 10 ? `, +${result.ambiguous.length - 10} more` : ""}
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
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Update custom fields</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Bulk-set Custom Field values on existing sites from a sheet -- only the fields you map below are touched,
          and mapping one attaches it to a site automatically if it isn&rsquo;t already.{" "}
          <button type="button" onClick={handleDownloadTemplate} className="text-brand-600 dark:text-brand-400 hover:underline">
            Download example template
          </button>
        </p>

        {allFields.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No Custom Fields exist yet -- add one from CRM &rarr; Custom Fields first.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="text-xs text-slate-700 dark:text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-200 dark:file:bg-slate-800 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-600 dark:file:text-brand-400"
              />
              <Button type="button" variant="secondary" onClick={handleUpload} disabled={uploading} className="w-fit">
                {uploading ? "Parsing…" : "Choose file"}
              </Button>
              {uploadError && <p className="text-xs text-critical">{uploadError}</p>}
            </div>

            {parsedRows && (
              <>
                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Match sites by — {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"} found.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Site ID column (recommended)</span>
                      <select
                        value={matchMapping.matchCode}
                        onChange={(e) => setMatchMapping((prev) => ({ ...prev, matchCode: e.target.value }))}
                        className={inputClass}
                      >
                        <option value={NONE}>None</option>
                        {parsedColumns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Record ID column</span>
                      <select
                        value={matchMapping.matchId}
                        onChange={(e) => setMatchMapping((prev) => ({ ...prev, matchId: e.target.value }))}
                        className={inputClass}
                      >
                        <option value={NONE}>None</option>
                        {parsedColumns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Site Name column</span>
                      <select
                        value={matchMapping.matchName}
                        onChange={(e) => setMatchMapping((prev) => ({ ...prev, matchName: e.target.value }))}
                        className={inputClass}
                      >
                        <option value={NONE}>None</option>
                        {parsedColumns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {!matchMapping.matchCode && !matchMapping.matchId && (
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Client (optional, disambiguates name matches)</span>
                      <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
                        <option value="">All clients</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                {fieldClasses
                  .filter((fc) => fc.fields.length > 0)
                  .map((fc) => (
                    <div
                      key={fc.id}
                      className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-3"
                    >
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {fc.name} — leave as None to leave untouched
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {fc.fields.map((f) => (
                          <label key={f.id} className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {f.label} <span className="text-slate-500 dark:text-slate-400">({f.fieldType})</span>
                            </span>
                            <select
                              value={fieldMapping[f.id] ?? NONE}
                              onChange={(e) => setFieldMapping((prev) => ({ ...prev, [f.id]: e.target.value }))}
                              className={inputClass}
                            >
                              <option value={NONE}>None</option>
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
                  ))}

                <Button
                  type="button"
                  onClick={handleUpdate}
                  disabled={
                    updating ||
                    !anyFieldMapped ||
                    (!matchMapping.matchCode && !matchMapping.matchId && !matchMapping.matchName)
                  }
                  className="mt-4 w-fit"
                >
                  {updating ? "Updating…" : `Update ${parsedRows.length} site${parsedRows.length === 1 ? "" : "s"}`}
                </Button>
                {updateError && <p className="mt-2 text-xs text-critical">{updateError}</p>}
              </>
            )}
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

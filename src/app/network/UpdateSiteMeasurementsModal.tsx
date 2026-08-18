"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { parseMeasurementInput } from "@/lib/siteMapColor";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import { buildTemplateXlsxAction } from "@/lib/sheetActions";
import type { Company } from "@/lib/crmTypes";
import type { SiteMeasurementsUpdateRow } from "@/lib/networkTypes";
import { bulkUpdateSiteMeasurementsAction, parseSiteSheetAction } from "./actions";

type ParsedRow = Record<string, string | number | boolean | null>;

const NONE = "";

/** Fixed set of measurement (sq. ft) and count labels this modal can map -- covers what the site detail page's Measurements/Counts sections track. */
const MEASUREMENT_FIELDS = [
  "Parking Lot",
  "Sidewalk",
  "Public Walk",
  "Bed Space",
  "Turf Area",
  "Retention Wall",
  "Rock Bed",
  "Native Mow",
  "Hedges",
] as const;

const COUNT_FIELDS = ["Palm Trees", "Deciduous Tree", "Shrubs"] as const;

const ALL_FIELDS = [...MEASUREMENT_FIELDS, ...COUNT_FIELDS];

const TEMPLATE_COLUMNS = ["Site ID", "Site Name", ...ALL_FIELDS];
const TEMPLATE_EXAMPLE = {
  "Site ID": "TDC0234",
  "Site Name": "Example Site",
  "Parking Lot": 12000,
  Sidewalk: 800,
  "Public Walk": 200,
  "Bed Space": 300,
  "Turf Area": 5000,
  "Retention Wall": 150,
  "Rock Bed": 400,
  "Native Mow": 2000,
  Hedges: 60,
  "Palm Trees": 4,
  "Deciduous Tree": 9,
  Shrubs: 22,
};

async function handleDownloadTemplate() {
  const base64 = await buildTemplateXlsxAction([TEMPLATE_EXAMPLE], TEMPLATE_COLUMNS);
  downloadBase64Xlsx(base64, "site_measurements_template.xlsx");
}

export default function UpdateSiteMeasurementsModal({
  companies,
  onClose,
}: {
  companies: Company[];
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [matchMapping, setMatchMapping] = useState({ matchCode: NONE, matchId: NONE, matchName: NONE });
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(
    Object.fromEntries(ALL_FIELDS.map((f) => [f, NONE])),
  );
  const [companyId, setCompanyId] = useState("");

  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; notFound: string[]; ambiguous: string[] } | null>(null);

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
          ALL_FIELDS.map((field) => {
            const normalized = field.toLowerCase().replace(/[^a-z]/g, "");
            const match = columns.find((c) => c.toLowerCase().replace(/[^a-z]/g, "") === normalized);
            return [field, match ?? NONE];
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
      const rows: SiteMeasurementsUpdateRow[] = parsedRows.map((row) => {
        const measurements: Record<string, number> = {};
        for (const field of MEASUREMENT_FIELDS) {
          const column = fieldMapping[field];
          if (!column) continue;
          const value = Number(parseMeasurementInput(String(row[column] ?? "")));
          if (Number.isFinite(value)) measurements[field] = value;
        }
        const counts: Record<string, number> = {};
        for (const field of COUNT_FIELDS) {
          const column = fieldMapping[field];
          if (!column) continue;
          const value = Number(row[column]);
          if (Number.isFinite(value)) counts[field] = value;
        }
        return {
          matchCode: matchMapping.matchCode ? String(row[matchMapping.matchCode] ?? "").trim() || null : null,
          matchId: matchMapping.matchId ? String(row[matchMapping.matchId] ?? "").trim() || null : null,
          matchName: matchMapping.matchName ? String(row[matchMapping.matchName] ?? "").trim() || null : null,
          measurements,
          counts,
        };
      });

      const outcome = await bulkUpdateSiteMeasurementsAction(rows, companyId || null);
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

  const anyFieldMapped = ALL_FIELDS.some((f) => fieldMapping[f]);

  if (result) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-50">Measurements updated</h2>
          <p className="mt-2 text-sm text-slate-300">
            Updated {result.updated} site{result.updated === 1 ? "" : "s"}. Only the mapped labels changed --
            everything else on those sites, including other measurements/counts, was left as-is.
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
        <h2 className="text-lg font-bold text-slate-50">Update measurements</h2>
        <p className="mt-1 text-xs text-slate-400">
          Bulk-set sq. ft measurements and plant/shrub counts on existing sites from a sheet -- only the labels you
          map below are touched.{" "}
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
                Match sites by — {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"} found.
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-300">Site ID column (recommended)</span>
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
                  <span className="font-medium text-slate-300">Record ID column</span>
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
                  <span className="font-medium text-slate-300">Site Name column</span>
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
                  <span className="font-medium text-slate-300">Client (optional, disambiguates name matches)</span>
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

            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-3">
              <p className="text-sm text-slate-300">Measurements (sq. ft) — leave as None to leave untouched</p>
              <div className="flex flex-wrap gap-3">
                {MEASUREMENT_FIELDS.map((field) => (
                  <label key={field} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-300">{field}</span>
                    <select
                      value={fieldMapping[field]}
                      onChange={(e) => setFieldMapping((prev) => ({ ...prev, [field]: e.target.value }))}
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

            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-3">
              <p className="text-sm text-slate-300">Counts — leave as None to leave untouched</p>
              <div className="flex flex-wrap gap-3">
                {COUNT_FIELDS.map((field) => (
                  <label key={field} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-300">{field}</span>
                    <select
                      value={fieldMapping[field]}
                      onChange={(e) => setFieldMapping((prev) => ({ ...prev, [field]: e.target.value }))}
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

        <div className="mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

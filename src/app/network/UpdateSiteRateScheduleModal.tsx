"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { TRADE_OPTIONS } from "@/lib/trades";
import { MONTHS } from "@/lib/rateSchedule";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import { buildTemplateXlsxAction } from "@/lib/sheetActions";
import type { Company } from "@/lib/crmTypes";
import type { SiteRateScheduleUpdateRow } from "@/lib/networkTypes";
import { bulkUpdateSiteRateScheduleAction, parseSiteSheetAction } from "./actions";

type ParsedRow = Record<string, string | number | boolean | null>;

const NONE = "";

const TEMPLATE_COLUMNS = ["Site ID", "Site Name", ...MONTHS];
const TEMPLATE_EXAMPLE = {
  "Site ID": "TDC0234",
  "Site Name": "Example Site",
  Jan: "",
  Feb: "",
  Mar: 1200,
  Apr: 1200,
  May: 1200,
  Jun: 1200,
  Jul: 1200,
  Aug: 1200,
  Sep: 1200,
  Oct: 1200,
  Nov: 1200,
  Dec: "",
};

async function handleDownloadTemplate() {
  const base64 = await buildTemplateXlsxAction([TEMPLATE_EXAMPLE], TEMPLATE_COLUMNS);
  downloadBase64Xlsx(base64, "site_rate_schedule_template.xlsx");
}

export default function UpdateSiteRateScheduleModal({
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

  const [trade, setTrade] = useState("");

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [matchMapping, setMatchMapping] = useState({ matchCode: NONE, matchId: NONE, matchName: NONE });
  const [monthMapping, setMonthMapping] = useState<Record<string, string>>(
    Object.fromEntries(MONTHS.map((m) => [m, NONE])),
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
      setMonthMapping(
        Object.fromEntries(
          MONTHS.map((month) => {
            const match = columns.find((c) => c.trim().toLowerCase() === month.toLowerCase());
            return [month, match ?? NONE];
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
    if (!trade || !parsedRows || (!matchMapping.matchCode && !matchMapping.matchId && !matchMapping.matchName)) return;
    setUpdateError(null);
    setUpdating(true);
    try {
      const rows: SiteRateScheduleUpdateRow[] = parsedRows.map((row) => {
        const rateSchedule: Partial<Record<(typeof MONTHS)[number], number>> = {};
        for (const month of MONTHS) {
          const column = monthMapping[month];
          if (!column) continue;
          const value = Number(row[column]);
          if (Number.isFinite(value)) rateSchedule[month] = value;
        }
        return {
          matchCode: matchMapping.matchCode ? String(row[matchMapping.matchCode] ?? "").trim() || null : null,
          matchId: matchMapping.matchId ? String(row[matchMapping.matchId] ?? "").trim() || null : null,
          matchName: matchMapping.matchName ? String(row[matchMapping.matchName] ?? "").trim() || null : null,
          rateSchedule,
        };
      });

      const outcome = await bulkUpdateSiteRateScheduleAction(trade, rows, companyId || null);
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

  const anyMonthMapped = MONTHS.some((m) => monthMapping[m]);

  if (result) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-50">{trade} rate schedule updated</h2>
          <p className="mt-2 text-sm text-slate-300">
            Updated {result.updated} site{result.updated === 1 ? "" : "s"}&rsquo; {trade} rate schedule. Only the
            mapped months changed -- every other trade, and any month you didn&rsquo;t map, was left untouched.
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
        <h2 className="text-lg font-bold text-slate-50">Update rate schedule</h2>
        <p className="mt-1 text-xs text-slate-400">
          Bulk-set which months one Trade is paid for, and how much, on existing sites from a sheet -- scoped to a
          single Trade you pick below, so e.g. updating Land&rsquo;s schedule never touches a site&rsquo;s Snow
          Removal schedule.{" "}
          <button type="button" onClick={handleDownloadTemplate} className="text-brand-400 hover:underline">
            Download example template
          </button>
        </p>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Trade (required)</span>
          <select value={trade} onChange={(e) => setTrade(e.target.value)} className={inputClass}>
            <option value="">Choose a trade…</option>
            {TRADE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
              <p className="text-sm text-slate-300">
                Months to update on the {trade || "selected trade"} schedule (leave as None to leave that month
                untouched)
              </p>
              <div className="flex flex-wrap gap-3">
                {MONTHS.map((month) => (
                  <label key={month} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-300">{month}</span>
                    <select
                      value={monthMapping[month]}
                      onChange={(e) => setMonthMapping((prev) => ({ ...prev, [month]: e.target.value }))}
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
              <p className="text-xs text-slate-500">
                A row&rsquo;s blank or non-numeric cell in a mapped month column leaves that month untouched for
                that site, rather than clearing it.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleUpdate}
              disabled={
                updating ||
                !trade ||
                !anyMonthMapped ||
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

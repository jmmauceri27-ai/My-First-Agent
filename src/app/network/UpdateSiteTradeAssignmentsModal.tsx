"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { TRADE_OPTIONS } from "@/lib/trades";
import type { Company } from "@/lib/crmTypes";
import type { SiteTradeAssignmentUpdateRow, Vendor } from "@/lib/networkTypes";
import { bulkUpdateSiteTradeAssignmentsAction, parseSiteSheetAction } from "./actions";

type ParsedRow = Record<string, string | number | boolean | null>;

const NONE = "";

const OPTIONAL_FIELDS = [
  ["vendorName", "Vendor Name column"],
  ["subVendorName", "Sub-Vendor Name column"],
  ["contractValue", "Contract Value column"],
  ["subPrice", "Sub Price column"],
  ["subVendorPrice", "Sub-Vendor Price column"],
] as const;

export default function UpdateSiteTradeAssignmentsModal({
  companies,
  vendors,
  onClose,
}: {
  companies: Company[];
  vendors: Vendor[];
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [trade, setTrade] = useState("");

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    matchCode: NONE,
    matchId: NONE,
    matchName: NONE,
    vendorName: NONE,
    subVendorName: NONE,
    contractValue: NONE,
    subPrice: NONE,
    subVendorPrice: NONE,
  });
  const [companyId, setCompanyId] = useState("");

  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; notFound: string[]; ambiguous: string[] } | null>(null);
  const [unmatchedVendorNames, setUnmatchedVendorNames] = useState<string[]>([]);

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
      setParsedRows(parsed.rows);
      setParsedColumns(parsed.columns);
      setMapping({
        matchCode: parsed.columns.find((c) => /site.?id/i.test(c)) ?? NONE,
        matchId: parsed.columns.find((c) => /^record ?id$/i.test(c) || /^id$/i.test(c)) ?? NONE,
        matchName: parsed.columns.find((c) => /name/i.test(c) && !/vendor/i.test(c)) ?? NONE,
        vendorName: parsed.columns.find((c) => /^vendor/i.test(c)) ?? NONE,
        subVendorName: parsed.columns.find((c) => /sub.?vendor/i.test(c) && /name/i.test(c)) ?? NONE,
        contractValue: parsed.columns.find((c) => /contract/i.test(c)) ?? NONE,
        subPrice: parsed.columns.find((c) => /^sub.?price/i.test(c)) ?? NONE,
        subVendorPrice: parsed.columns.find((c) => /sub.?vendor.?price/i.test(c)) ?? NONE,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload sheet.");
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdate() {
    if (!trade || !parsedRows || (!mapping.matchCode && !mapping.matchId && !mapping.matchName)) return;
    setUpdateError(null);
    setUpdating(true);
    try {
      const vendorByName = new Map(vendors.map((v) => [v.name.trim().toLowerCase(), v.id]));
      const unmatched: string[] = [];

      const rows: SiteTradeAssignmentUpdateRow[] = parsedRows.map((row) => {
        const update: SiteTradeAssignmentUpdateRow = {
          matchCode: mapping.matchCode ? String(row[mapping.matchCode] ?? "").trim() || null : null,
          matchId: mapping.matchId ? String(row[mapping.matchId] ?? "").trim() || null : null,
          matchName: mapping.matchName ? String(row[mapping.matchName] ?? "").trim() || null : null,
        };
        if (mapping.vendorName) {
          const raw = String(row[mapping.vendorName] ?? "").trim();
          if (!raw) update.vendorId = null;
          else {
            const id = vendorByName.get(raw.toLowerCase());
            if (id) update.vendorId = id;
            else unmatched.push(raw);
          }
        }
        if (mapping.subVendorName) {
          const raw = String(row[mapping.subVendorName] ?? "").trim();
          if (!raw) update.subVendorId = null;
          else {
            const id = vendorByName.get(raw.toLowerCase());
            if (id) update.subVendorId = id;
            else unmatched.push(raw);
          }
        }
        if (mapping.contractValue) {
          const v = Number(row[mapping.contractValue]);
          update.contractValue = Number.isFinite(v) ? v : null;
        }
        if (mapping.subPrice) {
          const v = Number(row[mapping.subPrice]);
          update.subPrice = Number.isFinite(v) ? v : null;
        }
        if (mapping.subVendorPrice) {
          const v = Number(row[mapping.subVendorPrice]);
          update.subVendorPrice = Number.isFinite(v) ? v : null;
        }
        return update;
      });

      const outcome = await bulkUpdateSiteTradeAssignmentsAction(trade, rows, companyId || null);
      if (outcome.error) {
        setUpdateError(outcome.error);
        return;
      }
      setUnmatchedVendorNames(Array.from(new Set(unmatched)));
      setResult(outcome);
      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-50">{trade} assignments updated</h2>
          <p className="mt-2 text-sm text-slate-300">
            Updated {result.updated} site{result.updated === 1 ? "" : "s"}&rsquo; {trade} assignment. Every other trade
            on those sites was left untouched.
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
          {unmatchedVendorNames.length > 0 && (
            <p className="mt-2 text-xs text-critical">
              {unmatchedVendorNames.length} vendor name{unmatchedVendorNames.length === 1 ? "" : "s"} didn&rsquo;t
              match any existing vendor (that field was left as-is on those rows):{" "}
              {unmatchedVendorNames.slice(0, 10).join(", ")}
              {unmatchedVendorNames.length > 10 ? `, +${unmatchedVendorNames.length - 10} more` : ""}
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
        <h2 className="text-lg font-bold text-slate-50">Update trade assignments</h2>
        <p className="mt-1 text-xs text-slate-400">
          Bulk-update one Trade&rsquo;s Vendor/Sub-Vendor/pricing on existing sites from a sheet -- scoped to a single
          Trade you pick below, so e.g. updating Land contract values never touches a site&rsquo;s Snow Removal
          assignment.
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
                    value={mapping.matchCode}
                    onChange={(e) => setMapping((prev) => ({ ...prev, matchCode: e.target.value }))}
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
                    value={mapping.matchId}
                    onChange={(e) => setMapping((prev) => ({ ...prev, matchId: e.target.value }))}
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
                    value={mapping.matchName}
                    onChange={(e) => setMapping((prev) => ({ ...prev, matchName: e.target.value }))}
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
              {!mapping.matchCode && !mapping.matchId && (
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
                Fields to update on the {trade || "selected trade"} assignment (leave as None to leave that field
                untouched)
              </p>
              <div className="flex flex-wrap gap-3">
                {OPTIONAL_FIELDS.map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-300">{label}</span>
                    <select
                      value={mapping[key]}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
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
                Vendor/Sub-Vendor Name columns are matched by exact vendor name (case-insensitive). A row whose name
                doesn&rsquo;t match an existing vendor leaves that site&rsquo;s current value alone and is reported
                after import.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleUpdate}
              disabled={updating || !trade || (!mapping.matchCode && !mapping.matchId && !mapping.matchName)}
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

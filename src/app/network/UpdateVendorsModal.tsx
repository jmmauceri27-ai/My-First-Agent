"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { parseUploadedSheetAction } from "@/lib/sheetActions";
import type { VendorUpdateRow } from "@/lib/networkTypes";
import { bulkUpdateVendorsAction } from "./actions";

type ParsedRow = Record<string, string | number | boolean | null>;

const NONE = "";

const OPTIONAL_FIELDS = [
  ["services", "Services column"],
  ["contactName", "Contact Name column"],
  ["email", "Email column"],
  ["phone", "Phone column"],
  ["website", "Website column"],
  ["address", "Address column"],
  ["city", "City column"],
  ["state", "State column"],
  ["lat", "Latitude column"],
  ["lng", "Longitude column"],
  ["notes", "Notes column"],
] as const;

export default function UpdateVendorsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    matchId: NONE,
    matchName: NONE,
    services: NONE,
    contactName: NONE,
    email: NONE,
    phone: NONE,
    website: NONE,
    address: NONE,
    city: NONE,
    state: NONE,
    lat: NONE,
    lng: NONE,
    notes: NONE,
  });

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
      const parsed = await parseUploadedSheetAction(formData);
      if (parsed.error || !parsed.rows || !parsed.columns) {
        setUploadError(parsed.error ?? "Failed to parse file.");
        return;
      }
      setParsedRows(parsed.rows);
      setParsedColumns(parsed.columns);
      setMapping({
        matchId: parsed.columns.find((c) => /^record ?id$/i.test(c) || /^id$/i.test(c)) ?? NONE,
        matchName: parsed.columns.find((c) => /vendor.?name|^name$/i.test(c)) ?? NONE,
        services: parsed.columns.find((c) => /service/i.test(c)) ?? NONE,
        contactName: parsed.columns.find((c) => /contact/i.test(c)) ?? NONE,
        email: parsed.columns.find((c) => /email/i.test(c)) ?? NONE,
        phone: parsed.columns.find((c) => /phone/i.test(c)) ?? NONE,
        website: parsed.columns.find((c) => /website|url/i.test(c)) ?? NONE,
        address: parsed.columns.find((c) => /address/i.test(c)) ?? NONE,
        city: parsed.columns.find((c) => /^city/i.test(c)) ?? NONE,
        state: parsed.columns.find((c) => /^state|^st$/i.test(c)) ?? NONE,
        lat: parsed.columns.find((c) => /^lat/i.test(c)) ?? NONE,
        lng: parsed.columns.find((c) => /^(lng|lon)/i.test(c)) ?? NONE,
        notes: parsed.columns.find((c) => /notes?/i.test(c)) ?? NONE,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload sheet.");
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdate() {
    if (!parsedRows || (!mapping.matchId && !mapping.matchName)) return;
    setUpdateError(null);
    setUpdating(true);
    try {
      const rows: VendorUpdateRow[] = parsedRows.map((row) => {
        const update: VendorUpdateRow = {
          matchId: mapping.matchId ? String(row[mapping.matchId] ?? "").trim() || null : null,
          matchName: mapping.matchName ? String(row[mapping.matchName] ?? "").trim() || null : null,
        };
        if (mapping.services) update.services = String(row[mapping.services] ?? "").trim() || null;
        if (mapping.contactName) update.contactName = String(row[mapping.contactName] ?? "").trim() || null;
        if (mapping.email) update.email = String(row[mapping.email] ?? "").trim() || null;
        if (mapping.phone) update.phone = String(row[mapping.phone] ?? "").trim() || null;
        if (mapping.website) update.website = String(row[mapping.website] ?? "").trim() || null;
        if (mapping.address) update.address = String(row[mapping.address] ?? "").trim() || null;
        if (mapping.city) update.city = String(row[mapping.city] ?? "").trim() || null;
        if (mapping.state) update.state = String(row[mapping.state] ?? "").trim() || null;
        if (mapping.lat) {
          const lat = Number(row[mapping.lat]);
          update.lat = Number.isFinite(lat) ? lat : null;
        }
        if (mapping.lng) {
          const lng = Number(row[mapping.lng]);
          update.lng = Number.isFinite(lng) ? lng : null;
        }
        if (mapping.notes) update.notes = String(row[mapping.notes] ?? "").trim() || null;
        return update;
      });

      const outcome = await bulkUpdateVendorsAction(rows);
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

  if (result) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Vendors updated</h2>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Updated {result.updated} vendor{result.updated === 1 ? "" : "s"}.
          </p>
          {result.notFound.length > 0 && (
            <p className="mt-2 text-xs text-critical">
              {result.notFound.length} row{result.notFound.length === 1 ? "" : "s"} didn&rsquo;t match any existing
              vendor: {result.notFound.slice(0, 10).join(", ")}
              {result.notFound.length > 10 ? `, +${result.notFound.length - 10} more` : ""}
            </p>
          )}
          {result.ambiguous.length > 0 && (
            <p className="mt-2 text-xs text-critical">
              {result.ambiguous.length} name{result.ambiguous.length === 1 ? "" : "s"} matched more than one vendor
              (map a Record ID column to disambiguate): {result.ambiguous.slice(0, 10).join(", ")}
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
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Update existing vendors</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Upload an .xlsx or .csv sheet to update vendors already in Network → Vendors — this never creates new
          vendors. The easiest way is to start from &ldquo;Download vendors&rdquo;, edit that file, then upload it
          here: its Record ID column matches each row automatically. Each row is matched by Record ID (best) or
          Vendor Name, and only the columns you map below get changed; anything you don&rsquo;t map is left as-is.
        </p>

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
                Match vendors by — {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"} found.
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Record ID column (recommended)</span>
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
                  <span className="font-medium text-slate-700 dark:text-slate-300">Vendor Name column</span>
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
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">Fields to update (leave as None to leave that field untouched)</p>
              <div className="flex flex-wrap gap-3">
                {OPTIONAL_FIELDS.map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
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
            </div>

            <Button
              type="button"
              onClick={handleUpdate}
              disabled={updating || (!mapping.matchId && !mapping.matchName)}
              className="mt-4 w-fit"
            >
              {updating ? "Updating…" : `Update ${parsedRows.length} vendor${parsedRows.length === 1 ? "" : "s"}`}
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

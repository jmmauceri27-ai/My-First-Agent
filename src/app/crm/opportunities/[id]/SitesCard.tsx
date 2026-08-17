"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import type { Site, SiteImportRow } from "@/lib/networkTypes";
import type { MapPin } from "@/components/SiteMap";
import { bulkCreateSitesForOpportunityAction, deleteSiteAction, parseSiteSheetAction } from "../../../network/actions";

const SiteMap = dynamic(() => import("@/components/SiteMap"), { ssr: false });

type ParsedRow = Record<string, string | number | boolean | null>;

const NONE = "";

export default function SitesCard({
  opportunityId,
  companyId,
  sites,
}: {
  opportunityId: string;
  companyId: string | null;
  sites: Site[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    name: NONE,
    lat: NONE,
    lng: NONE,
    address: NONE,
    city: NONE,
    state: NONE,
    zip: NONE,
    contractValue: NONE,
    subPrice: NONE,
  });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const result = await parseSiteSheetAction(formData);
      if (result.error || !result.rows || !result.columns) {
        setUploadError(result.error ?? "Failed to parse file.");
        return;
      }
      setParsedRows(result.rows);
      setParsedColumns(result.columns);
      setMapping({
        name: result.columns.find((c) => /name|site/i.test(c)) ?? result.columns[0] ?? NONE,
        lat: result.columns.find((c) => /^lat/i.test(c)) ?? NONE,
        lng: result.columns.find((c) => /^(lng|lon)/i.test(c)) ?? NONE,
        address: result.columns.find((c) => /address/i.test(c)) ?? NONE,
        city: result.columns.find((c) => /^city/i.test(c)) ?? NONE,
        state: result.columns.find((c) => /^state|^st$/i.test(c)) ?? NONE,
        zip: result.columns.find((c) => /zip|postal/i.test(c)) ?? NONE,
        contractValue: result.columns.find((c) => /contract/i.test(c)) ?? NONE,
        subPrice: result.columns.find((c) => /sub.?price/i.test(c)) ?? NONE,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload sites.");
    } finally {
      setUploading(false);
    }
  }

  function cancelImport() {
    setParsedRows(null);
    setParsedColumns([]);
    setImportError(null);
  }

  async function handleImport() {
    if (!parsedRows || !mapping.name || !mapping.lat || !mapping.lng) return;
    setImportError(null);
    setImporting(true);
    try {
      const rows: SiteImportRow[] = parsedRows.map((row) => {
        const lat = Number(row[mapping.lat]);
        const lng = Number(row[mapping.lng]);
        const contractValue = mapping.contractValue ? Number(row[mapping.contractValue]) : NaN;
        const subPrice = mapping.subPrice ? Number(row[mapping.subPrice]) : NaN;
        return {
          name: String(row[mapping.name] ?? "").trim() || "Untitled site",
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          address: mapping.address ? String(row[mapping.address] ?? "").trim() || null : null,
          city: mapping.city ? String(row[mapping.city] ?? "").trim() || null : null,
          state: mapping.state ? String(row[mapping.state] ?? "").trim() || null : null,
          zip: mapping.zip ? String(row[mapping.zip] ?? "").trim() || null : null,
          contractValue: Number.isFinite(contractValue) ? contractValue : null,
          subPrice: Number.isFinite(subPrice) ? subPrice : null,
        };
      });
      const result = await bulkCreateSitesForOpportunityAction(opportunityId, companyId, rows);
      if (result.error) {
        setImportError(result.error);
        return;
      }
      cancelImport();
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteSiteAction(id);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const pins: MapPin[] = sites
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({ id: s.id, lat: s.lat as number, lng: s.lng as number, label: s.name, fields: [] }));

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-50">Sites</h2>
          <p className="mt-1 text-xs text-slate-400">
            Upload the properties covered by this RFP — adds to Network → Sites, linked back to this opportunity.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="text-xs text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-800 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-400"
        />
        <Button type="button" variant="secondary" onClick={handleUpload} disabled={uploading} className="w-fit">
          {uploading ? "Uploading…" : "Upload sites"}
        </Button>
        {uploadError && <p className="text-xs text-critical">{uploadError}</p>}
      </div>

      {parsedRows && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-3">
          <p className="text-sm text-slate-300">
            Map this sheet&rsquo;s columns — {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"} found.
          </p>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["name", "Name column", true],
                ["lat", "Latitude column", true],
                ["lng", "Longitude column", true],
                ["address", "Address column (optional)", false],
                ["city", "City column (optional)", false],
                ["state", "State column (optional)", false],
                ["zip", "Zip column (optional)", false],
                ["contractValue", "Contract value column (optional)", false],
                ["subPrice", "Sub price column (optional)", false],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">{label}</span>
                <select
                  value={mapping[key]}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                  className={inputClass}
                >
                  <option value={NONE}>{key === "name" || key === "lat" || key === "lng" ? "Choose a column…" : "None"}</option>
                  {parsedColumns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleImport}
              disabled={importing || !mapping.name || !mapping.lat || !mapping.lng}
              variant="secondary"
              className="w-fit"
            >
              {importing ? "Importing…" : "Import sites"}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelImport} className="w-fit">
              Cancel
            </Button>
          </div>
          {importError && <p className="text-xs text-critical">{importError}</p>}
        </div>
      )}

      {sites.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-xs text-slate-400">
            {pins.length} of {sites.length} site{sites.length === 1 ? "" : "s"} plotted
            {sites.length - pins.length > 0 ? ` (${sites.length - pins.length} missing coordinates)` : ""}
          </p>
          {pins.length > 0 && (
            <div className="h-72 overflow-hidden rounded-lg">
              <SiteMap pins={pins} onPinClick={(id) => router.push(`/network/sites/${id}`)} />
            </div>
          )}
          <div className="flex flex-col divide-y divide-purple-400/10">
            {sites.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/network/sites/${s.id}`} className="min-w-0 truncate text-sm text-slate-50 hover:text-brand-400 hover:underline">
                  {s.name}
                </Link>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="shrink-0 text-xs font-semibold text-critical hover:underline"
                >
                  {deletingId === s.id ? "…" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sites.length === 0 && !parsedRows && (
        <p className="mt-4 text-xs text-slate-400">No sites uploaded yet for this opportunity.</p>
      )}
    </Card>
  );
}

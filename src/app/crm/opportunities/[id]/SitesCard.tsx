"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EditSitePanel from "@/components/EditSitePanel";
import { inputClass } from "@/components/ui/formClasses";
import type { OpportunitySiteBinding, OpportunitySiteRow } from "@/lib/crmTypes";
import type { DatasetRecord } from "@/lib/types";
import { saveOpportunitySiteBindingAction, updateOpportunitySiteRowAction, uploadOpportunitySitesAction } from "../../actions";
import type { MapPin } from "@/components/SiteMap";

const SiteMap = dynamic(() => import("@/components/SiteMap"), { ssr: false });

export default function SitesCard({
  opportunityId,
  binding,
  rows,
}: {
  opportunityId: string;
  binding: OpportunitySiteBinding | null;
  rows: OpportunitySiteRow[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const columns = rows.length > 0 ? Object.keys(rows[0].data) : [];
  const [editingMapping, setEditingMapping] = useState(false);
  const [draft, setDraft] = useState({
    lat: binding?.latColumn ?? "",
    lng: binding?.lngColumn ?? "",
    label: binding?.labelColumn ?? "",
  });
  const [savingMapping, setSavingMapping] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  function toggleMappingForm() {
    if (!editingMapping) {
      setDraft({ lat: binding?.latColumn ?? "", lng: binding?.lngColumn ?? "", label: binding?.labelColumn ?? "" });
    }
    setEditingMapping((v) => !v);
  }

  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const editingRow = rows.find((r) => r.id === editingRowId) ?? null;

  const showMappingForm = rows.length > 0 && (editingMapping || !binding);

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
      const result = await uploadOpportunitySitesAction(opportunityId, formData);
      if (result.error) {
        setUploadError(result.error);
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload sites.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveMapping() {
    if (!draft.lat || !draft.lng) return;
    setSavingMapping(true);
    setMappingError(null);
    try {
      await saveOpportunitySiteBindingAction(opportunityId, {
        latColumn: draft.lat,
        lngColumn: draft.lng,
        labelColumn: draft.label || null,
      });
      setEditingMapping(false);
      router.refresh();
    } catch (e) {
      setMappingError(e instanceof Error ? e.message : "Failed to save the column mapping.");
    } finally {
      setSavingMapping(false);
    }
  }

  async function handleSaveRow(data: DatasetRecord) {
    if (editingRowId === null) return;
    await updateOpportunitySiteRowAction(opportunityId, editingRowId, data);
    router.refresh();
  }

  const pins: MapPin[] = binding
    ? rows.flatMap((row) => {
        const lat = Number(row.data[binding.latColumn]);
        const lng = Number(row.data[binding.lngColumn]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
        const label = binding.labelColumn ? String(row.data[binding.labelColumn] ?? "").trim() : "";
        return [{ rowId: row.id, lat, lng, label: label || "Site", fields: [] }];
      })
    : [];

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Sites</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Upload the properties covered by this RFP — shown as pins below.
          </p>
        </div>
        {binding && rows.length > 0 && (
          <Button type="button" variant="ghost" onClick={toggleMappingForm}>
            {editingMapping ? "Cancel" : "Change columns"}
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="text-xs text-slate-700 file:mr-2 file:rounded-lg file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-700 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-brand-400"
        />
        <Button type="button" variant="secondary" onClick={handleUpload} disabled={uploading} className="w-fit">
          {uploading ? "Uploading…" : rows.length > 0 ? "Re-upload (replaces current sites)" : "Upload sites"}
        </Button>
        {uploadError && <p className="text-xs text-critical">{uploadError}</p>}
      </div>

      {showMappingForm && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Map this sheet&rsquo;s columns once — remembered for next time.
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Latitude column</span>
              <select
                value={draft.lat}
                onChange={(e) => setDraft((p) => ({ ...p, lat: e.target.value }))}
                className={inputClass}
              >
                <option value="">Choose a column…</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Longitude column</span>
              <select
                value={draft.lng}
                onChange={(e) => setDraft((p) => ({ ...p, lng: e.target.value }))}
                className={inputClass}
              >
                <option value="">Choose a column…</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Site name column (optional)</span>
              <select
                value={draft.label}
                onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
                className={inputClass}
              >
                <option value="">None</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button
            type="button"
            onClick={handleSaveMapping}
            disabled={savingMapping || !draft.lat || !draft.lng}
            variant="secondary"
            className="w-fit"
          >
            {savingMapping ? "Saving…" : "Save & view map"}
          </Button>
          {mappingError && <p className="text-xs text-critical">{mappingError}</p>}
        </div>
      )}

      {!showMappingForm && binding && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pins.length} of {rows.length} site{rows.length === 1 ? "" : "s"} plotted
            {rows.length - pins.length > 0 ? ` (${rows.length - pins.length} missing valid coordinates)` : ""}
          </p>
          {pins.length > 0 ? (
            <div className="h-72 overflow-hidden rounded-lg">
              <SiteMap pins={pins} onPinClick={setEditingRowId} />
            </div>
          ) : (
            <p className="text-sm text-slate-400">No sites have valid latitude/longitude values to plot.</p>
          )}
        </div>
      )}

      {rows.length === 0 && <p className="mt-4 text-xs text-slate-400">No sites uploaded yet for this opportunity.</p>}

      {editingRow && (
        <EditSitePanel title="Edit site" data={editingRow.data} onClose={() => setEditingRowId(null)} onSave={handleSaveRow} />
      )}
    </Card>
  );
}

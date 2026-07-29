"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import type { DatasetRecord, DatasetRowWithId, DatasetSummary, SiteMapBinding } from "@/lib/types";
import {
  fetchDatasetRowsWithIdsAction,
  getSiteMapBindingAction,
  saveSiteMapBindingAction,
  updateSiteRowAction,
} from "./actions";
import EditSitePanel from "./EditSitePanel";
import type { MapPin } from "@/components/SiteMap";

const SiteMap = dynamic(() => import("@/components/SiteMap"), { ssr: false });

export default function SiteMapClient({ datasets }: { datasets: DatasetSummary[] }) {
  const router = useRouter();
  const [datasetId, setDatasetId] = useState("");
  const [binding, setBinding] = useState<SiteMapBinding | null>(null);
  const [loadedDatasetId, setLoadedDatasetId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ lat: string; lng: string; label: string; popup: string[] }>({
    lat: "",
    lng: "",
    label: "",
    popup: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [rows, setRows] = useState<DatasetRowWithId[]>([]);
  const [rowsLoadedFor, setRowsLoadedFor] = useState<string | null>(null);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [editingRowId, setEditingRowId] = useState<number | null>(null);

  const dataset = datasets.find((d) => d.id === datasetId);
  const loading = datasetId !== "" && loadedDatasetId !== datasetId;

  useEffect(() => {
    if (!dataset) return;
    let cancelled = false;
    getSiteMapBindingAction(dataset.id)
      .then((result) => {
        if (cancelled) return;
        setBinding(result);
        setDraft({
          lat: result?.latColumn ?? "",
          lng: result?.lngColumn ?? "",
          label: result?.labelColumn ?? "",
          popup: result?.popupColumns ?? [],
        });
        setLoadError(null);
        setEditing(!result);
        setLoadedDatasetId(dataset.id);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Failed to check for a saved column mapping.");
        setLoadedDatasetId(dataset.id);
      });
    return () => {
      cancelled = true;
    };
  }, [dataset]);

  const rowsLoading = dataset !== undefined && binding !== null && rowsLoadedFor !== dataset.id;

  useEffect(() => {
    if (!dataset || !binding) return;
    let cancelled = false;
    fetchDatasetRowsWithIdsAction(dataset.id)
      .then((result) => {
        if (cancelled) return;
        setRows(result);
        setRowsError(null);
        setRowsLoadedFor(dataset.id);
      })
      .catch((e) => {
        if (cancelled) return;
        setRowsError(e instanceof Error ? e.message : "Failed to load rows for this dataset.");
        setRowsLoadedFor(dataset.id);
      });
    return () => {
      cancelled = true;
    };
  }, [dataset, binding]);

  async function handleSaveMapping() {
    if (!dataset || !draft.lat || !draft.lng) return;
    setSaving(true);
    setSaveError(null);
    try {
      const newBinding: SiteMapBinding = {
        latColumn: draft.lat,
        lngColumn: draft.lng,
        labelColumn: draft.label || null,
        popupColumns: draft.popup,
      };
      await saveSiteMapBindingAction(dataset.id, newBinding);
      setBinding(newBinding);
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save the column mapping.");
    } finally {
      setSaving(false);
    }
  }

  const pins = useMemo<MapPin[]>(() => {
    if (!binding) return [];
    const result: MapPin[] = [];
    for (const row of rows) {
      const lat = Number(row.data[binding.latColumn]);
      const lng = Number(row.data[binding.lngColumn]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const label = binding.labelColumn ? String(row.data[binding.labelColumn] ?? "").trim() : "";
      result.push({
        rowId: row.id,
        lat,
        lng,
        label: label || "Site",
        fields: binding.popupColumns.map((col) => ({ key: col, value: String(row.data[col] ?? "") })),
      });
    }
    return result;
  }, [rows, binding]);

  const skippedCount = rows.length - pins.length;
  const editingRow = rows.find((r) => r.id === editingRowId) ?? null;
  const editingRowLabel =
    editingRow && binding?.labelColumn ? String(editingRow.data[binding.labelColumn] ?? "").trim() : "";

  async function handleSaveRow(data: DatasetRecord) {
    if (!dataset || editingRowId === null) return;
    await updateSiteRowAction(dataset.id, editingRowId, data);
    setRows((prev) => prev.map((r) => (r.id === editingRowId ? { ...r, data } : r)));
    router.refresh();
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-50">Site Map</h2>
          <p className="text-sm text-slate-400">
            Upload a sheet of site locations (via Upload Data), then pick it here to plot pins. Click a pin to
            view or edit that site&rsquo;s details.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Dataset</span>
          <select value={datasetId} onChange={(e) => setDatasetId(e.target.value)} className={inputClass}>
            <option value="">Choose a dataset…</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.displayName} ({d.category})
              </option>
            ))}
          </select>
        </label>
      </div>

      {dataset && loading && <p className="mt-4 text-sm text-slate-400">Loading…</p>}

      {dataset && !loading && loadError && (
        <p className="mt-4 text-sm text-critical">
          Couldn&rsquo;t check for a saved mapping: {loadError}
          {loadError.toLowerCase().includes("site_map_bindings") &&
            " — have you run supabase/007_site_map_bindings.sql in your Supabase project yet?"}
        </p>
      )}

      {dataset && !loading && editing && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-4">
          <p className="text-sm text-slate-300">
            Map &ldquo;{dataset.displayName}&rdquo;&rsquo;s columns once — this is remembered for next time.
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Latitude column</span>
              <select
                value={draft.lat}
                onChange={(e) => setDraft((prev) => ({ ...prev, lat: e.target.value }))}
                className={inputClass}
              >
                <option value="">Choose a column…</option>
                {dataset.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Longitude column</span>
              <select
                value={draft.lng}
                onChange={(e) => setDraft((prev) => ({ ...prev, lng: e.target.value }))}
                className={inputClass}
              >
                <option value="">Choose a column…</option>
                {dataset.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Site name column (optional)</span>
              <select
                value={draft.label}
                onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
                className={inputClass}
              >
                <option value="">None</option>
                {dataset.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="text-sm font-medium text-slate-300">Show in pin popup (optional)</span>
            <div className="mt-1 flex flex-wrap gap-3">
              {dataset.columns
                .filter((c) => c !== draft.lat && c !== draft.lng && c !== draft.label)
                .map((c) => (
                  <label key={c} className="flex items-center gap-1.5 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={draft.popup.includes(c)}
                      onChange={() =>
                        setDraft((prev) => ({
                          ...prev,
                          popup: prev.popup.includes(c)
                            ? prev.popup.filter((p) => p !== c)
                            : [...prev.popup, c],
                        }))
                      }
                      className="accent-brand-600"
                    />
                    {c}
                  </label>
                ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveMapping}
              disabled={saving || !draft.lat || !draft.lng}
              variant="secondary"
              className="w-fit"
            >
              {saving ? "Saving…" : "Save & view map"}
            </Button>
            {binding && (
              <Button onClick={() => setEditing(false)} variant="ghost" className="w-fit">
                Cancel
              </Button>
            )}
          </div>
          {saveError && (
            <p className="text-sm text-critical">
              Couldn&rsquo;t save: {saveError}
              {saveError.toLowerCase().includes("site_map_bindings") &&
                " — have you run supabase/007_site_map_bindings.sql in your Supabase project yet?"}
            </p>
          )}
        </div>
      )}

      {dataset && !loading && !editing && binding && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {rowsLoading
                ? "Loading rows…"
                : `${pins.length} of ${rows.length} rows plotted` +
                  (skippedCount > 0 ? ` (${skippedCount} missing valid coordinates)` : "")}
            </p>
            <Button onClick={() => setEditing(true)} variant="ghost" className="w-fit">
              Change columns
            </Button>
          </div>
          {rowsError && <p className="text-sm text-critical">Couldn&rsquo;t load rows: {rowsError}</p>}
          {!rowsLoading && !rowsError && pins.length === 0 && (
            <p className="text-sm text-slate-400">No rows have valid latitude/longitude values to plot.</p>
          )}
          {!rowsLoading && pins.length > 0 && <SiteMap pins={pins} onPinClick={setEditingRowId} />}
        </div>
      )}

      {editingRow && (
        <EditSitePanel
          title={editingRowLabel || "Edit site"}
          data={editingRow.data}
          onClose={() => setEditingRowId(null)}
          onSave={handleSaveRow}
        />
      )}
    </Card>
  );
}

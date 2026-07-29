"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/formClasses";
import {
  buildCategoricalPalette,
  gradientColorForRatio,
  NEUTRAL_PIN_COLOR,
  resolveColorMetric,
} from "@/lib/siteMapColor";
import {
  MARGIN_METRIC_KEY,
  MARGIN_METRIC_LABEL,
  type DatasetRecord,
  type DatasetRowWithId,
  type DatasetSummary,
  type SiteMapBinding,
  type SiteMapColorMode,
  type SiteMapView,
} from "@/lib/types";
import {
  deleteSiteMapViewAction,
  fetchDatasetRowsWithIdsAction,
  getSiteMapBindingAction,
  listSiteMapViewsAction,
  saveSiteMapBindingAction,
  saveSiteMapViewAction,
  updateSiteRowAction,
} from "./actions";
import EditSitePanel from "./EditSitePanel";
import FilterSidebar from "./FilterSidebar";
import MapLegend, { type MapLegendProps } from "./MapLegend";
import type { MapPin } from "@/components/SiteMap";

const SiteMap = dynamic(() => import("@/components/SiteMap"), { ssr: false });

interface MappingDraft {
  lat: string;
  lng: string;
  label: string;
  popup: string[];
  contractValue: string;
  subPrice: string;
  filter: string[];
}

export default function SiteMapClient({ datasets }: { datasets: DatasetSummary[] }) {
  const router = useRouter();
  const [datasetId, setDatasetId] = useState("");
  const [binding, setBinding] = useState<SiteMapBinding | null>(null);
  const [loadedDatasetId, setLoadedDatasetId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MappingDraft>({
    lat: "",
    lng: "",
    label: "",
    popup: [],
    contractValue: "",
    subPrice: "",
    filter: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  const [rows, setRows] = useState<DatasetRowWithId[]>([]);
  const [rowsLoadedFor, setRowsLoadedFor] = useState<string | null>(null);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [editingRowId, setEditingRowId] = useState<number | null>(null);

  const [views, setViews] = useState<SiteMapView[]>([]);
  const [viewsError, setViewsError] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [addingView, setAddingView] = useState(false);
  const [viewDraft, setViewDraft] = useState<{ name: string; colorColumn: string; colorMode: SiteMapColorMode }>({
    name: "",
    colorColumn: "",
    colorMode: "categorical",
  });
  const [viewSaving, setViewSaving] = useState(false);
  const [viewSaveError, setViewSaveError] = useState<string | null>(null);

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
          contractValue: result?.contractValueColumn ?? "",
          subPrice: result?.subPriceColumn ?? "",
          filter: result?.filterColumns ?? [],
        });
        setLoadError(null);
        setEditing(!result);
        setLoadedDatasetId(dataset.id);
        setActiveFilters({});
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

  useEffect(() => {
    if (!dataset || !binding) return;
    let cancelled = false;
    listSiteMapViewsAction(dataset.id)
      .then((result) => {
        if (cancelled) return;
        setViews(result);
        setViewsError(null);
        setActiveViewId(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setViewsError(e instanceof Error ? e.message : "Failed to load saved views.");
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
        contractValueColumn: draft.contractValue || null,
        subPriceColumn: draft.subPrice || null,
        filterColumns: draft.filter,
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

  const hasMargin = Boolean(binding?.contractValueColumn && binding?.subPriceColumn);
  const colorByOptions = useMemo(() => {
    if (!dataset) return [];
    return [
      ...(hasMargin ? [{ key: MARGIN_METRIC_KEY, label: MARGIN_METRIC_LABEL }] : []),
      ...dataset.columns.map((c) => ({ key: c, label: c })),
    ];
  }, [dataset, hasMargin]);

  function suggestColorMode(column: string): SiteMapColorMode {
    if (column === MARGIN_METRIC_KEY) return "gradient";
    const sample = rows
      .slice(0, 20)
      .map((r) => r.data[column])
      .filter((v) => v !== null && v !== undefined && v !== "");
    if (sample.length === 0) return "categorical";
    const numeric = sample.filter((v) => Number.isFinite(Number(v))).length;
    return numeric / sample.length >= 0.8 ? "gradient" : "categorical";
  }

  async function handleSaveView() {
    if (!dataset || !viewDraft.name.trim() || !viewDraft.colorColumn) return;
    setViewSaving(true);
    setViewSaveError(null);
    try {
      const id = await saveSiteMapViewAction(dataset.id, {
        name: viewDraft.name.trim(),
        colorColumn: viewDraft.colorColumn,
        colorMode: viewDraft.colorMode,
      });
      const newView: SiteMapView = {
        id,
        name: viewDraft.name.trim(),
        colorColumn: viewDraft.colorColumn,
        colorMode: viewDraft.colorMode,
      };
      setViews((prev) => [...prev.filter((v) => v.id !== id), newView]);
      setActiveViewId(id);
      setAddingView(false);
      setViewDraft({ name: "", colorColumn: "", colorMode: "categorical" });
    } catch (e) {
      setViewSaveError(e instanceof Error ? e.message : "Failed to save this view.");
    } finally {
      setViewSaving(false);
    }
  }

  async function handleDeleteView(viewId: string) {
    await deleteSiteMapViewAction(viewId);
    setViews((prev) => prev.filter((v) => v.id !== viewId));
    if (activeViewId === viewId) setActiveViewId(null);
  }

  const activeView = views.find((v) => v.id === activeViewId) ?? null;

  const filteredRows = useMemo(() => {
    const activeCols = Object.entries(activeFilters).filter(([, values]) => values.length > 0);
    if (activeCols.length === 0) return rows;
    return rows.filter((row) =>
      activeCols.every(([column, values]) => {
        const raw = row.data[column];
        const display = raw === null || raw === undefined || raw === "" ? "(blank)" : String(raw);
        return values.includes(display);
      }),
    );
  }, [rows, activeFilters]);

  const mapData = useMemo(() => {
    if (!binding) return { pins: [] as MapPin[], legend: null as MapLegendProps | null };

    const plotted: { row: DatasetRowWithId; lat: number; lng: number }[] = [];
    for (const row of filteredRows) {
      const lat = Number(row.data[binding.latColumn]);
      const lng = Number(row.data[binding.lngColumn]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      plotted.push({ row, lat, lng });
    }

    let colorByRowId: Map<number, string> | null = null;
    let legend: MapLegendProps | null = null;

    if (activeView) {
      colorByRowId = new Map();
      if (activeView.colorMode === "gradient") {
        const numericValues: number[] = [];
        for (const { row } of plotted) {
          const raw = resolveColorMetric(row.data, activeView.colorColumn, binding);
          const num = raw === null ? NaN : Number(raw);
          if (Number.isFinite(num)) numericValues.push(num);
        }
        const min = numericValues.length ? Math.min(...numericValues) : 0;
        const max = numericValues.length ? Math.max(...numericValues) : 0;
        for (const { row } of plotted) {
          const raw = resolveColorMetric(row.data, activeView.colorColumn, binding);
          const num = raw === null ? NaN : Number(raw);
          if (!Number.isFinite(num)) continue;
          const ratio = max === min ? 0.5 : (num - min) / (max - min);
          colorByRowId.set(row.id, gradientColorForRatio(ratio));
        }
        if (numericValues.length > 0) {
          legend = { mode: "gradient", min, max, isCurrency: activeView.colorColumn === MARGIN_METRIC_KEY };
        }
      } else {
        const stringValues: string[] = [];
        for (const { row } of plotted) {
          const raw = resolveColorMetric(row.data, activeView.colorColumn, binding);
          if (raw !== null) stringValues.push(String(raw));
        }
        const palette = buildCategoricalPalette(stringValues);
        for (const { row } of plotted) {
          const raw = resolveColorMetric(row.data, activeView.colorColumn, binding);
          if (raw === null) continue;
          colorByRowId.set(row.id, palette.get(String(raw)) ?? NEUTRAL_PIN_COLOR);
        }
        if (palette.size > 0) {
          legend = {
            mode: "categorical",
            entries: Array.from(palette.entries()).map(([label, color]) => ({ label, color })),
          };
        }
      }
    }

    const pins: MapPin[] = plotted.map(({ row, lat, lng }) => {
      const label = binding.labelColumn ? String(row.data[binding.labelColumn] ?? "").trim() : "";
      return {
        rowId: row.id,
        lat,
        lng,
        label: label || "Site",
        fields: binding.popupColumns.map((col) => ({ key: col, value: String(row.data[col] ?? "") })),
        color: activeView ? (colorByRowId?.get(row.id) ?? NEUTRAL_PIN_COLOR) : undefined,
      };
    });

    return { pins, legend };
  }, [filteredRows, binding, activeView]);

  const { pins, legend } = mapData;
  const skippedCount = filteredRows.length - pins.length;
  const filteredOutCount = rows.length - filteredRows.length;
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-400/20 bg-[#1c1430] px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-slate-50">🧾 Procurement — Site Map</h1>
          <p className="text-xs text-slate-400">Click a pin to view or edit that site&rsquo;s details.</p>
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

      <div className="flex min-h-0 flex-1">
        <FilterSidebar
          key={`${dataset?.id ?? ""}:${binding?.filterColumns.join("|") ?? ""}`}
          filterColumns={dataset && binding && !editing ? binding.filterColumns : []}
          rows={rows}
          onApply={setActiveFilters}
          onClear={() => setActiveFilters({})}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!dataset && (
            <p className="p-6 text-sm text-slate-400">
              Choose a dataset above to view its site map. Upload one first on the Upload Data page if you
              haven&rsquo;t already.
            </p>
          )}

          {dataset && loading && <p className="p-6 text-sm text-slate-400">Loading…</p>}

          {dataset && !loading && loadError && (
            <p className="p-6 text-sm text-critical">
              Couldn&rsquo;t check for a saved mapping: {loadError}
              {loadError.toLowerCase().includes("site_map_bindings") &&
                " — have you run supabase/007_site_map_bindings.sql in your Supabase project yet?"}
            </p>
          )}

          {dataset && !loading && editing && (
            <div className="m-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-4">
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

              <div className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-300">Contract Value column (optional)</span>
                  <select
                    value={draft.contractValue}
                    onChange={(e) => setDraft((prev) => ({ ...prev, contractValue: e.target.value }))}
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
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-300">Sub Price column (optional)</span>
                  <select
                    value={draft.subPrice}
                    onChange={(e) => setDraft((prev) => ({ ...prev, subPrice: e.target.value }))}
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
              <p className="text-xs text-slate-500">
                Map both to unlock a &ldquo;{MARGIN_METRIC_LABEL}&rdquo; color-by option in views (Contract
                Value − Sub Price).
              </p>

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

              <div>
                <span className="text-sm font-medium text-slate-300">Available as sidebar filters (optional)</span>
                <p className="text-xs text-slate-500">Choose which columns show up as filter groups on the map.</p>
                <div className="mt-1 flex flex-wrap gap-3">
                  {dataset.columns.map((c) => (
                    <label key={c} className="flex items-center gap-1.5 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={draft.filter.includes(c)}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            filter: prev.filter.includes(c)
                              ? prev.filter.filter((f) => f !== c)
                              : [...prev.filter, c],
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
            <div className="flex h-full flex-col gap-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => setActiveViewId(null)}
                    variant={activeViewId === null ? "primary" : "secondary"}
                    className="w-fit"
                  >
                    All
                  </Button>
                  {views.map((v) => (
                    <div key={v.id} className="flex items-center gap-1">
                      <Button
                        onClick={() => setActiveViewId(v.id)}
                        variant={activeViewId === v.id ? "primary" : "secondary"}
                        className="w-fit"
                      >
                        {v.name}
                      </Button>
                      <button
                        onClick={() => handleDeleteView(v.id)}
                        title={`Delete "${v.name}"`}
                        className="text-slate-500 hover:text-critical"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <Button onClick={() => setAddingView((prev) => !prev)} variant="ghost" className="w-fit">
                    {addingView ? "Cancel" : "+ Add view"}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-slate-400">
                    {rowsLoading
                      ? "Loading rows…"
                      : `${pins.length} of ${filteredRows.length} rows plotted` +
                        (skippedCount > 0 ? ` (${skippedCount} missing valid coordinates)` : "") +
                        (filteredOutCount > 0 ? ` (${filteredOutCount} hidden by filters)` : "")}
                  </p>
                  {activeView && legend && <MapLegend {...legend} />}
                  {activeView && !legend && !rowsLoading && (
                    <p className="text-xs text-slate-500">No sites have data for this view yet.</p>
                  )}
                  <Button onClick={() => setEditing(true)} variant="ghost" className="w-fit">
                    Change columns
                  </Button>
                </div>
              </div>

              {viewsError && <p className="text-sm text-critical">Couldn&rsquo;t load saved views: {viewsError}</p>}

              {addingView && (
                <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-purple-400/30 p-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-300">Name</span>
                    <input
                      value={viewDraft.name}
                      onChange={(e) => setViewDraft((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Price"
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-300">Color by</span>
                    <select
                      value={viewDraft.colorColumn}
                      onChange={(e) =>
                        setViewDraft((prev) => ({
                          ...prev,
                          colorColumn: e.target.value,
                          colorMode: suggestColorMode(e.target.value),
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="">Choose…</option>
                      {colorByOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {viewDraft.colorColumn && viewDraft.colorColumn !== MARGIN_METRIC_KEY && (
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-300">Style</span>
                      <select
                        value={viewDraft.colorMode}
                        onChange={(e) =>
                          setViewDraft((prev) => ({ ...prev, colorMode: e.target.value as SiteMapColorMode }))
                        }
                        className={inputClass}
                      >
                        <option value="gradient">Gradient (numeric)</option>
                        <option value="categorical">Category (distinct values)</option>
                      </select>
                    </label>
                  )}
                  <Button
                    onClick={handleSaveView}
                    disabled={viewSaving || !viewDraft.name.trim() || !viewDraft.colorColumn}
                    variant="secondary"
                    className="w-fit"
                  >
                    {viewSaving ? "Saving…" : "Save view"}
                  </Button>
                  {viewSaveError && <p className="text-sm text-critical">{viewSaveError}</p>}
                </div>
              )}

              {rowsError && <p className="text-sm text-critical">Couldn&rsquo;t load rows: {rowsError}</p>}
              {!rowsLoading && !rowsError && pins.length === 0 && (
                <p className="text-sm text-slate-400">No rows have valid latitude/longitude values to plot.</p>
              )}
              {!rowsLoading && pins.length > 0 && (
                <div className="min-h-0 flex-1 overflow-hidden rounded-lg">
                  <SiteMap pins={pins} onPinClick={setEditingRowId} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editingRow && (
        <EditSitePanel
          title={editingRowLabel || "Edit site"}
          data={editingRow.data}
          onClose={() => setEditingRowId(null)}
          onSave={handleSaveRow}
        />
      )}
    </div>
  );
}

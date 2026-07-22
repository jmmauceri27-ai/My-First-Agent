"use client";

import { useEffect, useState } from "react";
import { applyFilters, FILTER_OPS } from "@/lib/kpi";
import type { DatasetRecord, DatasetSummary, FilterCondition, FilterOp } from "@/lib/types";
import { exportToExcel, fetchRows } from "./actions";

function downloadBase64Xlsx(base64: string, filename: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExplorerClient({ datasets }: { datasets: DatasetSummary[] }) {
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [rows, setRows] = useState<DatasetRecord[]>([]);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [filterColumn, setFilterColumn] = useState("");
  const [filterOp, setFilterOp] = useState<FilterOp>("eq");
  const [filterValue, setFilterValue] = useState("");
  const [exporting, setExporting] = useState(false);

  const dataset = datasets.find((d) => d.id === datasetId);
  const loading = loadedForId !== datasetId;

  useEffect(() => {
    if (!datasetId) return;
    let cancelled = false;
    fetchRows(datasetId).then((r) => {
      if (cancelled) return;
      setRows(r);
      setLoadedForId(datasetId);
    });
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  const filters: FilterCondition[] =
    filterColumn && filterValue ? [{ column: filterColumn, op: filterOp, value: filterValue }] : [];
  const filteredRows = applyFilters(rows, filters);

  async function handleExport() {
    if (!dataset) return;
    setExporting(true);
    try {
      const base64 = await exportToExcel(filteredRows, dataset.columns);
      downloadBase64Xlsx(base64, `${dataset.displayName}_export.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-fit flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Dataset</span>
        <select
          value={datasetId}
          onChange={(e) => setDatasetId(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.displayName}
            </option>
          ))}
        </select>
      </label>

      {dataset && (
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Filter:</span>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Column</span>
            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">(none)</option>
              {dataset.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Operator</span>
            <select
              value={filterOp}
              onChange={(e) => setFilterOp(e.target.value as FilterOp)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {FILTER_OPS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Value</span>
            <input
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>
      )}

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {loading ? "Loading…" : `Showing ${Math.min(filteredRows.length, 200)} of ${filteredRows.length} filtered rows (${rows.length} total)`}
      </p>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              {dataset?.columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-medium text-zinc-500">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {filteredRows.slice(0, 200).map((row, i) => (
              <tr key={i}>
                {dataset?.columns.map((c) => (
                  <td key={c} className="whitespace-nowrap px-3 py-2 text-zinc-700 dark:text-zinc-300">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting || !dataset}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {exporting ? "Preparing…" : "⬇️ Download as Excel"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { applyFilters, FILTER_OPS } from "@/lib/kpi";
import type { DatasetRecord, DatasetSummary, FilterCondition, FilterOp } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
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
        <span className="font-medium text-slate-700 dark:text-slate-300">Dataset</span>
        <select
          value={datasetId}
          onChange={(e) => setDatasetId(e.target.value)}
          className={inputClass}
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
          <span className="text-sm text-slate-500 dark:text-slate-400">Filter:</span>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Column</span>
            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              className={inputClass}
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
            <span className="font-medium text-slate-700 dark:text-slate-300">Operator</span>
            <select
              value={filterOp}
              onChange={(e) => setFilterOp(e.target.value as FilterOp)}
              className={inputClass}
            >
              {FILTER_OPS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Value</span>
            <input
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {loading ? "Loading…" : `Showing ${Math.min(filteredRows.length, 200)} of ${filteredRows.length} filtered rows (${rows.length} total)`}
      </p>

      <Card className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              {dataset?.columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-500">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {filteredRows.slice(0, 200).map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                {dataset?.columns.map((c) => (
                  <td key={c} className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Button onClick={handleExport} disabled={exporting || !dataset} className="w-fit">
        {exporting ? "Preparing…" : "⬇️ Download as Excel"}
      </Button>
    </div>
  );
}

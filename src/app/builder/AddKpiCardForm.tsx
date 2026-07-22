"use client";

import { useState } from "react";
import { KPI_AGG_LABELS, FILTER_OPS } from "@/lib/kpi";
import type { DatasetSummary, FilterOp, KpiAgg, KpiCard } from "@/lib/types";
import { LabeledInput, LabeledSelect } from "./FormControls";

export default function AddKpiCardForm({
  datasets,
  onAdd,
}: {
  datasets: DatasetSummary[];
  onAdd: (card: KpiCard) => void;
}) {
  const [title, setTitle] = useState("");
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [agg, setAgg] = useState<KpiAgg>("count_rows");
  const [column, setColumn] = useState("");
  const [filterColumn, setFilterColumn] = useState("");
  const [filterOp, setFilterOp] = useState<FilterOp>("eq");
  const [filterValue, setFilterValue] = useState("");

  const dataset = datasets.find((d) => d.id === datasetId);
  const needsColumn = agg !== "count_rows" && agg !== "pct_match";

  function handleAdd() {
    if (!title.trim() || !dataset) return;
    if (needsColumn && !column) return;

    const card: KpiCard = {
      type: "kpi",
      title: title.trim(),
      datasetId: dataset.id,
      datasetName: dataset.displayName,
      agg,
      column: needsColumn ? column : undefined,
      filters:
        filterColumn && filterValue
          ? [{ column: filterColumn, op: filterOp, value: filterValue }]
          : undefined,
    };
    onAdd(card);
    setTitle("");
    setFilterColumn("");
    setFilterValue("");
  }

  if (datasets.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">➕ Add KPI card</h3>
      <div className="flex flex-wrap gap-3">
        <LabeledInput label="Title" value={title} onChange={setTitle} />
        <LabeledSelect
          label="Dataset"
          value={datasetId}
          onChange={setDatasetId}
          options={datasets.map((d) => ({ value: d.id, label: d.displayName }))}
        />
        <LabeledSelect
          label="Aggregation"
          value={agg}
          onChange={(v) => setAgg(v as KpiAgg)}
          options={Object.entries(KPI_AGG_LABELS).map(([value, label]) => ({ value, label }))}
        />
        {needsColumn && dataset && (
          <LabeledSelect
            label="Column"
            value={column}
            onChange={setColumn}
            options={dataset.columns.map((c) => ({ value: c, label: c }))}
          />
        )}
      </div>

      {dataset && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Optional filter:</span>
          <LabeledSelect
            label="Column"
            value={filterColumn}
            onChange={setFilterColumn}
            options={[{ value: "", label: "(none)" }, ...dataset.columns.map((c) => ({ value: c, label: c }))]}
          />
          <LabeledSelect
            label="Operator"
            value={filterOp}
            onChange={(v) => setFilterOp(v as FilterOp)}
            options={FILTER_OPS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <LabeledInput label="Value" value={filterValue} onChange={setFilterValue} />
        </div>
      )}

      <button
        onClick={handleAdd}
        className="mt-3 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      >
        Add KPI card
      </button>
    </div>
  );
}

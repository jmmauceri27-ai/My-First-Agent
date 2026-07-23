"use client";

import { useState } from "react";
import { CHART_AGG_LABELS, CHART_TYPES, FILTER_OPS } from "@/lib/kpi";
import type { ChartAgg, ChartCard, ChartType, DatasetSummary, FilterOp } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { LabeledInput, LabeledSelect } from "./FormControls";

const COUNT_ROWS = "__count_rows__";

export default function AddChartCardForm({
  datasets,
  onAdd,
}: {
  datasets: DatasetSummary[];
  onAdd: (card: ChartCard) => void;
}) {
  const [title, setTitle] = useState("");
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [x, setX] = useState("");
  const [y, setY] = useState(COUNT_ROWS);
  const [agg, setAgg] = useState<ChartAgg>("sum");
  const [filterColumn, setFilterColumn] = useState("");
  const [filterOp, setFilterOp] = useState<FilterOp>("eq");
  const [filterValue, setFilterValue] = useState("");

  const dataset = datasets.find((d) => d.id === datasetId);

  function handleAdd() {
    if (!title.trim() || !dataset || !x) return;

    const card: ChartCard = {
      type: "chart",
      title: title.trim(),
      datasetId: dataset.id,
      datasetName: dataset.displayName,
      chartType,
      x,
      y: y === COUNT_ROWS ? undefined : y,
      agg: y === COUNT_ROWS ? "count" : agg,
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
    <Card className="border-dashed p-4 shadow-none">
      <h3 className="mb-3 font-bold text-zinc-900 dark:text-zinc-50">➕ Add chart card</h3>
      <div className="flex flex-wrap gap-3">
        <LabeledInput label="Title" value={title} onChange={setTitle} />
        <LabeledSelect
          label="Dataset"
          value={datasetId}
          onChange={setDatasetId}
          options={datasets.map((d) => ({ value: d.id, label: d.displayName }))}
        />
        <LabeledSelect
          label="Chart type"
          value={chartType}
          onChange={(v) => setChartType(v as ChartType)}
          options={CHART_TYPES.map((c) => ({ value: c, label: c }))}
        />
        {dataset && (
          <LabeledSelect
            label="X-axis / category"
            value={x}
            onChange={setX}
            options={dataset.columns.map((c) => ({ value: c, label: c }))}
          />
        )}
        {dataset && (
          <LabeledSelect
            label="Y-axis / value"
            value={y}
            onChange={setY}
            options={[
              { value: COUNT_ROWS, label: "(count of rows)" },
              ...dataset.columns.map((c) => ({ value: c, label: c })),
            ]}
          />
        )}
        {y !== COUNT_ROWS && (
          <LabeledSelect
            label="Aggregation"
            value={agg}
            onChange={(v) => setAgg(v as ChartAgg)}
            options={Object.entries(CHART_AGG_LABELS)
              .filter(([v]) => v !== "count")
              .map(([value, label]) => ({ value, label }))}
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

      <Button onClick={handleAdd} variant="secondary" className="mt-3">
        Add chart card
      </Button>
    </Card>
  );
}
